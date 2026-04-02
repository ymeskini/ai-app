import { generateText } from "ai";
import { summarizationModel } from "../model.ts";
import { renderPrompt } from "../prompts/index.ts";
import { cacheWithRedis } from "~/server/redis/redis.ts";

interface SummarizeURLArgs {
  conversation: string;
  scrapedContent: string;
  searchMetadata: {
    date: string;
    title: string;
    url: string;
  };
  query: string;
  langfuseTraceId?: string;
}

export const summarizeURL = cacheWithRedis(
  "summarizeURL",
  async (opts: SummarizeURLArgs): Promise<string> => {
    const {
      conversation,
      scrapedContent,
      searchMetadata,
      query,
      langfuseTraceId,
    } = opts;

    const { prompt } = renderPrompt("summarize-url", {
      query,
      title: searchMetadata.title,
      url: searchMetadata.url,
      date: searchMetadata.date,
      conversation,
      scrapedContent,
    });

    const { text } = await generateText({
      model: summarizationModel,
      prompt: prompt,
      experimental_telemetry: langfuseTraceId
        ? {
            isEnabled: true,
            functionId: "summarize-url",
            metadata: {
              langfuseTraceId,
              url: searchMetadata.url,
              query,
            },
          }
        : undefined,
    });

    return text;
  },
);
