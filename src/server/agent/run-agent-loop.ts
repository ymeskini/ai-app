import {
  ToolLoopAgent,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
  type StreamTextResult,
  type InferAgentUIMessage,
  type ModelMessage,
} from "ai";
import { z } from "zod";

import { model } from "../../lib/model.ts";
import { searchSerper } from "~/server/serper.ts";
import { bulkCrawlWebsites } from "~/server/scraper.ts";
import { summarizeURL } from "./summarize-url.ts";

type Source = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

function messagesToConversationString(messages: ModelMessage[]): string {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const content =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("")
            : "";
      return `<${role}>${content}</${role}>`;
    })
    .join("\n\n");
}

export const searchWebTool = tool({
  description:
    "Search the web for information to answer the user's question. Use this when you need to find relevant information.",
  inputSchema: z.object({
    title: z
      .string()
      .describe(
        "Concise title for this search step, e.g. 'Searching for X'. Be extremely concise.",
      ),
    reasoning: z.string().describe("Why you are performing this search"),
    queries: z
      .array(z.string())
      .min(1)
      .max(5)
      .describe(
        "3-5 specific and focused search queries to execute in parallel",
      ),
  }),
  execute: async ({ queries }, { messages }) => {
    const conversation = messagesToConversationString(messages);

    // Search in parallel for all queries
    const allSearchResults = await Promise.all(
      queries.map(async (query) => {
        const results = await searchSerper({ q: query, num: 3 }, undefined);
        return { query, results: results.organic };
      }),
    );

    // Deduplicate sources by URL
    const uniqueSources: Source[] = Array.from(
      new Map(
        allSearchResults
          .flatMap((sr) => sr.results)
          .map((result) => [
            result.link,
            {
              title: result.title,
              url: result.link,
              snippet: result.snippet,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}`,
            },
          ]),
      ).values(),
    );

    // Scrape and summarize all results
    const processedResults = (
      await Promise.all(
        allSearchResults.map(async ({ query, results }) => {
          const urls = results.map((r) => r.link);
          const crawlResults = await bulkCrawlWebsites({ urls });

          return Promise.all(
            results.map(async (result) => {
              const crawlData = crawlResults.success
                ? crawlResults.results.find((cr) => cr.url === result.link)
                : undefined;

              const scrapedContent = crawlData?.result.success
                ? crawlData.result.data
                : "Failed to scrape.";

              if (scrapedContent === "Failed to scrape.") {
                return {
                  query,
                  title: result.title,
                  url: result.link,
                  snippet: result.snippet,
                  summary:
                    "Failed to scrape, so no summary could be generated.",
                  date: result.date ?? new Date().toISOString(),
                };
              }

              const summary = await summarizeURL({
                conversation,
                scrapedContent,
                searchMetadata: {
                  date: result.date ?? new Date().toISOString(),
                  title: result.title,
                  url: result.link,
                },
                query,
              });

              return {
                query,
                title: result.title,
                url: result.link,
                snippet: result.snippet,
                summary,
                date: result.date ?? new Date().toISOString(),
              };
            }),
          );
        }),
      )
    ).flat();

    return {
      sources: uniqueSources,
      results: processedResults,
    };
  },
});

const agentInstructions = `You are a research assistant that answers questions by searching the web.

PROCESS:
1. Analyze the user's question and create a research plan
2. Search for information using the searchWeb tool with 3-5 specific queries
3. Review the results and determine if you have enough information
4. If not, search again with refined queries targeting information gaps
5. Once you have sufficient information, provide a comprehensive answer

When answering:
- Be thorough but concise
- Always cite your sources using markdown links
- Format URLs as markdown links using [title](url)
- Never include raw URLs`;

// Exported for type inference only
export const deepSearchAgent = new ToolLoopAgent({
  model,
  instructions: agentInstructions,
  tools: { searchWeb: searchWebTool },
  stopWhen: [stepCountIs(4)],
});

export type DeepSearchUIMessage = InferAgentUIMessage<typeof deepSearchAgent>;

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    langfuseTraceId?: string;
  },
): Promise<StreamTextResult<any, any>> {
  const agent = new ToolLoopAgent({
    model,
    instructions: agentInstructions,
    tools: { searchWeb: searchWebTool },
    stopWhen: [stepCountIs(4)],
    experimental_telemetry: opts.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "deep-search",
          metadata: { langfuseTraceId: opts.langfuseTraceId },
        }
      : undefined,
  });

  const modelMessages = await convertToModelMessages(messages);
  return agent.stream({ messages: modelMessages });
}
