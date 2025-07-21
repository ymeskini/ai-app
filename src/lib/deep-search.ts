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

      ## PLANNING INSTRUCTIONS
      Before you answer any question, you should devise a plan to answer the question. Your plan should be a list of steps.

      You should then execute the plan by calling the tools available to you.

      If you receive new information which changes your plan, you should update your plan and execute the new plan.

      ## RESEARCH WORKFLOW
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

      ## SOURCE PRIORITIZATION
      When selecting sources, prioritize information quality and reliability:

      - **Authoritative Sources**: Government websites, official organization pages, academic institutions
      - **Established Media**: Reputable news organizations with editorial standards
      - **Expert Analysis**: Industry publications, professional journals, recognized experts
      - **Primary Sources**: Official statements, direct quotes, original research
      - **Recent Content**: Prefer newer content when dealing with current events or evolving topics

      Choose 4-6 URLs minimum per query:
      - Prioritize different domains/websites for diverse perspectives
      - Include authoritative sources when available
      - Mix official sources with analysis/opinion pieces when relevant
      - Avoid obviously biased or unreliable sources

      ## MARKDOWN LINK FORMATTING INSTRUCTIONS
      You must format all links as inline markdown links using the exact syntax: \`[link text](URL)\`

      **Requirements:**
      - Always use inline link format, never reference-style links
      - Link text should be descriptive and meaningful
      - URLs must be complete and functional
      - No spaces between the closing bracket \`]\` and opening parenthesis \`(\`
      - Ensure proper escaping of special characters in URLs if needed

      **Examples:**

      ✅ **Correct:** For more information about machine learning, visit the [Stanford AI course](https://cs229.stanford.edu/) which covers fundamental concepts.

      ❌ **Incorrect:** For more information about machine learning, visit the Stanford AI course[1] which covers fundamental concepts.

      ✅ **Correct:** The [OpenAI API documentation](https://platform.openai.com/docs) provides comprehensive guides for developers working with GPT models.

      ❌ **Incorrect:** The OpenAI API documentation (https://platform.openai.com/docs) provides comprehensive guides for developers working with GPT models.

      ✅ **Correct:** According to the [latest research paper](https://arxiv.org/abs/2103.00020), transformer architectures continue to show promising results in natural language processing tasks.

      ❌ **Incorrect:** According to the latest research paper at https://arxiv.org/abs/2103.00020, transformer architectures continue to show promising results in natural language processing tasks.

      Follow this format consistently throughout your response.

      ## TECHNICAL DETAILS
      The scrapePages tool will:
      - Extract the full text content from web pages
      - Convert HTML to readable markdown format
      - Respect robots.txt restrictions
      - Handle rate limiting and retries automatically
      - Return detailed error messages if pages cannot be scraped
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
