import {
  ToolLoopAgent,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
  type InferAgentUIMessage,
  type ModelMessage,
} from "ai";
import { z } from "zod";

import { model } from "../model.ts";
import { renderPrompt } from "../prompts/index.ts";
import { searchSerper } from "~/server/serper.ts";
import { bulkCrawlWebsites } from "~/server/scraper.ts";
import { summarizeURL } from "./summarize-url.ts";
import type { SearchToolResult } from "./types.ts";

interface Source {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

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

function buildAgentInstructions() {
  const { prompt } = renderPrompt("agent-instructions", {
    currentDate: new Date().toLocaleString(),
  });
  return prompt;
}

// Exported for type inference only
export const deepSearchAgent = new ToolLoopAgent({
  model,
  instructions: buildAgentInstructions(),
  tools: { searchWeb: searchWebTool },
  stopWhen: [stepCountIs(4)],
});

export type DeepSearchUIMessage = InferAgentUIMessage<typeof deepSearchAgent>;

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    langfuseTraceId?: string;
  },
): Promise<SearchToolResult> {
  const agent = new ToolLoopAgent({
    model,
    instructions: buildAgentInstructions(),
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
