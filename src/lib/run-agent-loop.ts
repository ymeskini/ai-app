import type { StreamTextResult, Message } from "ai";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsitesWithJina, type CrawlResponse } from "~/lib/scraper";
import {
  getNextAction,
  type OurMessageAnnotation,
} from "~/lib/get-next-action";
import { answerQuestion } from "~/lib/answer-question";
import {
  SystemContext,
  type QueryResult,
  type QueryResultSearchResult,
} from "~/lib/system-context";
import { env } from "~/env";
import type { StreamTextFinishResult } from "~/types/chat";

/**
 * Search the web using Serper API
 */
export const searchWeb = async (
  query: string,
  signal?: AbortSignal,
): Promise<QueryResultSearchResult[]> => {
  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    signal,
  );

  return results.organic.map((result): QueryResultSearchResult => {
    return {
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      date: (result.date ?? new Date().toISOString().split("T")[0])!,
    };
  });
};

/**
 * Scrape URLs using Jina scraper
 */
export const scrapeUrl = async (urls: string[]) => {
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
};

/**
 * Main agent loop that continues until we have an answer or reach max steps
 */
export const runAgentLoop = async (
  userQuery: string,
  messages: Message[],
  locationContext: string,
  maxSteps = 10,
  writeMessageAnnotation: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId: string,
  onFinish: (finishResult: StreamTextFinishResult) => void,
): Promise<StreamTextResult<never, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(locationContext, messages);

  // A loop that continues until we have an answer or we've taken maxSteps actions
  while (ctx.getStep() < maxSteps) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(
      ctx,
      userQuery,
      langfuseTraceId,
    );

    // Send annotation about the action we chose
    const stepIndex = ctx.getStep();
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: nextAction,
      });
    }

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      // Update status to loading
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "ACTION_UPDATE",
          stepIndex,
          status: "loading",
        });
      }

      try {
        const searchResults = await searchWeb(nextAction.query);

        // Convert search results to the format expected by SystemContext
        const queryResult: QueryResult = {
          query: nextAction.query,
          results: searchResults.map((result) => ({
            date: result.date,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
          })),
        };

        ctx.reportQueries([queryResult]);

        // Update status to completed
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "completed",
          });
        }
      } catch (error) {
        // Update status to error
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "error",
            error: error instanceof Error ? error.message : "Search failed",
          });
        }
        throw error;
      }
    } else if (nextAction.type === "scrape") {
      // Update status to loading
      if (writeMessageAnnotation) {
        writeMessageAnnotation({
          type: "ACTION_UPDATE",
          stepIndex,
          status: "loading",
        });
      }

      try {
        const scrapeResults = await scrapeUrl(nextAction.urls);

        // Handle the case where scrapeResults might have an error
        if ("success" in scrapeResults && !scrapeResults.success) {
          // If bulk scraping failed, still try to report what we got
          const scrapeData = scrapeResults.results
            .filter((result) => result.success && result.content)
            .map((result) => ({
              url: result.url,
              result: result.content!,
            }));

          ctx.reportScrapes(scrapeData);
        } else if (Array.isArray(scrapeResults)) {
          // Filter successful scrapes and report them
          const scrapeData = scrapeResults
            .filter((result) => result.success && result.content)
            .map((result) => ({
              url: result.url,
              result: result.content!,
            }));

          ctx.reportScrapes(scrapeData);
        }

        // Update status to completed
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "completed",
          });
        }
      } catch (error) {
        // Update status to error
        if (writeMessageAnnotation) {
          writeMessageAnnotation({
            type: "ACTION_UPDATE",
            stepIndex,
            status: "error",
            error: error instanceof Error ? error.message : "Scraping failed",
          });
        }
        throw error;
      }
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, userQuery, messages, {
        langfuseTraceId,
        onFinish,
      });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken maxSteps actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, userQuery, messages, {
    isFinal: true,
    langfuseTraceId,
    onFinish,
  });
};
