import {
  streamText,
  type Message,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import { searchSerper } from "~/serper";
import { type CrawlResponse, bulkCrawlWebsitesWithJina } from "~/lib/scraper";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: `
      You are a helpful AI assistant with access to web search and web scraping capabilities.

      Current date and time: ${new Date().toLocaleString()}

      When users ask for "current", "latest", "recent", or "up-to-date" information, please reference this date in your queries to ensure you're providing the most relevant and timely information available.

      IMPORTANT RULE: You MUST use the scrapePages tool after using the searchWeb tool. This is mandatory - search snippets alone are not sufficient.

      When answering questions, you should:
          1. Use the searchWeb tool to find current and relevant information from the web
          2. ALWAYS follow up immediately with the scrapePages tool using 4-6 URLs from the search results to get complete content
          3. Select a diverse set of sources - choose URLs from different domains/websites to get varied perspectives
          4. Always cite your sources with inline links in your responses
          5. Provide comprehensive answers based on the full scraped content, not just search snippets
          6. If the user asks about recent events, current information, or anything that might benefit from web search, use both tools in sequence

      Workflow:
      1. searchWeb → get URLs and snippets
      2. scrapePages → scrape 4-6 diverse URLs from those results (MANDATORY)
      3. Answer based on complete scraped content from multiple sources

      Source Selection Guidelines:
      - Choose 4-6 URLs minimum per query
      - Prioritize different domains/websites for diverse perspectives
      - Include authoritative sources when available
      - Mix official sources with analysis/opinion pieces when relevant

      The scrapePages tool will:
      - Extract the full text content from web pages
      - Convert HTML to readable markdown format
      - Respect robots.txt restrictions
      - Handle rate limiting and retries automatically
      - Return detailed error messages if pages cannot be scraped

      Format your citations like this: [Source Title](URL) when referencing information from search results or scraped pages.
    `,
    tools: {
      searchWeb: {
        parameters: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }: { query: string }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: 10 },
            abortSignal,
          );

          return results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          }));
        },
      },
      scrapePages: {
        parameters: z.object({
          urls: z.array(z.string()).describe("Array of URLs to scrape and extract full content from"),
        }),
        execute: async ({ urls }: { urls: string[] }) => {
          const results = await bulkCrawlWebsitesWithJina({
            urls,
            maxRetries: 3,
          });

          const processResult = (result: { url: string; result: CrawlResponse }) => {
            if (result.result.success) {
              return {
                url: result.url,
                success: true,
                content: result.result.data,
                error: undefined,
              };
            } else {
              return {
                url: result.url,
                success: false,
                content: undefined,
                error: result.result.error,
              };
            }
          };

          if (results.success) {
            return results.results.map(processResult);
          } else {
            return {
              success: false,
              error: results.error,
              results: results.results.map(processResult),
            };
          }
        },
      },
    },
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {
      // No-op for evaluation purposes
      return;
    },
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
