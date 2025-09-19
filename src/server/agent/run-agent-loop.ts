import {
  type StreamTextResult,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";

import { SystemContext } from "./system-context.ts";
import { getNextAction } from "./get-next-action.ts";
import { answerQuestion } from "./answer-question.ts";
import type { OurMessage } from "./types.ts";
import { summarizeURL } from "./summarize-url.ts";
import { queryRewriter } from "./query-rewriter.ts";
// import { checkIsSafe } from "../../lib/guardrails.ts";
import { searchSerper } from "~/serper.ts";
import { bulkCrawlWebsites } from "~/server/scraper.ts";

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    langfuseTraceId?: string;
    writeMessagePart?: UIMessageStreamWriter<OurMessage>["write"];
  },
): Promise<StreamTextResult<any, string>> {
  const usageDataPartId = crypto.randomUUID();
  const ctx = new SystemContext(messages);

  // Guardrail check before entering the main loop
  // const guardrailResult = await checkIsSafe(ctx);
  // if (guardrailResult.classification === "refuse") {
  //   // Return a refusal message as a streamText result
  //   return streamText({
  //     model,
  //     system:
  //       "You are a content safety guardrail. Refuse to answer unsafe questions.",
  //     prompt:
  //       guardrailResult.reason ?? "Sorry, I can't help with that request.",
  //   });
  // }

  while (!ctx.shouldStop()) {
    const { queries } = await queryRewriter(ctx, opts);
    const searchResultsPromises = queries.map(async (query) => {
      // 1. Search the web
      const searchResults = await searchSerper({ q: query, num: 3 }, undefined);

      return {
        query,
        results: searchResults.organic,
      };
    });

    // 3. Wait for all search results
    const allSearchResults = await Promise.all(searchResultsPromises);

    // 4. Deduplicate sources by URL
    const uniqueSources = Array.from(
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

    // 5. Send unique sources to frontend
    if (opts.writeMessagePart) {
      opts.writeMessagePart({
        type: "data-sources",
        data: uniqueSources,
      });
    }

    // 6. Process each query's results
    const processPromises = allSearchResults.map(async ({ query, results }) => {
      const searchResultUrls = results.map((r) => r.link);

      // Scrape the results
      const crawlResults = await bulkCrawlWebsites({ urls: searchResultUrls });

      // Summarize each scraped result in parallel
      const summaries = await Promise.all(
        results.map(async (result) => {
          const crawlData = crawlResults.success
            ? crawlResults.results.find((cr) => cr.url === result.link)
            : undefined;

          const scrapedContent = crawlData?.result.success
            ? crawlData.result.data
            : "Failed to scrape.";

          if (scrapedContent === "Failed to scrape.") {
            return {
              ...result,
              summary: "Failed to scrape, so no summary could be generated.",
            };
          }

          const summary = await summarizeURL({
            conversation: ctx.getMessageHistory(),
            scrapedContent,
            searchMetadata: {
              date: result.date ?? new Date().toISOString(),
              title: result.title,
              url: result.link,
            },
            query,
            langfuseTraceId: opts.langfuseTraceId,
            ctx,
          });

          return {
            ...result,
            summary,
          };
        }),
      );

      // Report the summaries to the system context
      ctx.reportSearch({
        query,
        results: summaries.map((summaryResult) => ({
          date: summaryResult.date ?? new Date().toISOString(),
          title: summaryResult.title,
          url: summaryResult.link,
          snippet: summaryResult.snippet,
          summary: summaryResult.summary,
        })),
      });
    });

    // 7. Wait for all processing to complete
    await Promise.all(processPromises);

    // 8. Decide whether to continue or answer
    const nextAction = await getNextAction(ctx, opts);

    // Store the feedback in the system context only if it exists
    if (nextAction.feedback) {
      ctx.setLastFeedback(nextAction.feedback);
    }

    // Send the action as an annotation if writeMessageAnnotation is provided
    if (opts.writeMessagePart) {
      opts.writeMessagePart({
        type: "data-new-action",
        data: nextAction,
      });
      // Send token usage annotation
      const usages = ctx.getUsages();
      if (usages.length > 0) {
        const totalTokens = usages.reduce(
          (sum, u) => sum + (u.totalTokens || 0),
          0,
        );
        opts.writeMessagePart({
          id: usageDataPartId,
          type: "data-usage",
          data: {
            totalTokens,
          },
        });
      }
    }

    if (nextAction.type === "answer") {
      return answerQuestion(ctx, { isFinal: false, ...opts });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and haven't answered yet,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, { isFinal: true, ...opts });
}
