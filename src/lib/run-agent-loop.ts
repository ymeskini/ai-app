import type { StreamTextResult, Message } from "ai";
import * as Sentry from "@sentry/nextjs";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import {
  getNextAction,
  type OurMessageAnnotation,
} from "~/lib/get-next-action";
import { answerQuestion } from "~/lib/answer-question";
import {
  SystemContext,
  type SearchHistoryEntry,
  type SearchResult,
  type QueryResultSearchResult,
} from "~/lib/system-context";
import { env } from "~/env";
import type { StreamTextFinishResult } from "~/types/chat";
import { summarizeURL } from "~/lib/summarize-url";

/**
 * Combined search and scrape function that automatically scrapes the most relevant URLs
 */
export const searchAndScrape = async (
  query: string,
  messages: Message[],
  langfuseTraceId: string,
  signal?: AbortSignal,
): Promise<SearchHistoryEntry> => {
  return Sentry.startSpan(
    {
      op: "ai.search_and_scrape",
      name: "Search and Scrape",
    },
    async (span) => {
      try {
        span.setAttribute("search.query", query);
        span.setAttribute("search.results_count", env.SEARCH_RESULTS_COUNT);
        span.setAttribute("langfuse.trace_id", langfuseTraceId);

        // First, search for results
        const searchResults = await searchSerper(
          { q: query, num: env.SEARCH_RESULTS_COUNT },
          signal,
        );

        const initialResults: QueryResultSearchResult[] =
          searchResults.organic.map((result): QueryResultSearchResult => {
            return {
              title: result.title,
              url: result.link,
              snippet: result.snippet,
              date: (result.date ?? new Date().toISOString().split("T")[0])!,
            };
          });

        // Extract URLs to scrape (up to the number of search results we have)
        const urlsToScrape = initialResults.map((result) => result.url);
        span.setAttribute("scrape.urls_count", urlsToScrape.length);

        // Scrape all the URLs
        const scrapeResults = await bulkCrawlWebsites({
          urls: urlsToScrape,
          maxRetries: 3,
        });

        // Process scrape results
        const processedScrapeResults: Record<string, string> = {};

        if (scrapeResults.success) {
          scrapeResults.results.forEach((result) => {
            if (result.result.success) {
              processedScrapeResults[result.url] = result.result.data;
            }
          });
        } else {
          // Handle partial failures
          scrapeResults.results.forEach((result) => {
            if (result.result.success) {
              processedScrapeResults[result.url] = result.result.data;
            }
          });
        }

        span.setAttribute(
          "scrape.successful_count",
          Object.keys(processedScrapeResults).length,
        );

        // Combine search results with scraped content
        const combinedResults: SearchResult[] = initialResults.map(
          (result) => ({
            date: result.date,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            scrapedContent: processedScrapeResults[result.url] ?? "",
          }),
        );

        // Summarize all URLs in parallel
        const summaryPromises = combinedResults.map(async (result) => {
          // Only summarize if we have scraped content
          if (
            result.scrapedContent &&
            result.scrapedContent.trim().length > 0
          ) {
            try {
              // todo fix this summary structure
              const summary = await summarizeURL({
                conversation: messages
                  .map((message) => {
                    const role = message.role === "user" ? "User" : "Assistant";
                    return `<${role}>${message.content}</${role}>`;
                  })
                  .join("\n\n"),
                scrapedContent: result.scrapedContent,
                searchMetadata: {
                  date: result.date,
                  title: result.title,
                  url: result.url,
                },
                query,
                langfuseTraceId,
              });
              return {
                ...result,
                summary: summary,
              };
            } catch (error) {
              // If summarization fails, keep the original result
              console.error(`Failed to summarize ${result.url}:`, error);
              Sentry.captureException(error, {
                contexts: {
                  url_summarization: {
                    url: result.url,
                    query,
                  },
                },
              });
              return result;
            }
          }
          return result;
        });

        const resultsWithSummaries = await Promise.all(summaryPromises);

        return {
          query,
          results: resultsWithSummaries,
        };
      } catch (error) {
        Sentry.captureException(error, {
          contexts: {
            search_and_scrape: {
              query,
              langfuse_trace_id: langfuseTraceId,
            },
          },
        });
        throw error;
      }
    },
  );
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
  return Sentry.startSpan(
    {
      op: "ai.agent_loop",
      name: "Run Agent Loop",
    },
    async (span) => {
      try {
        span.setAttribute("agent.user_query", userQuery);
        span.setAttribute("agent.max_steps", maxSteps);
        span.setAttribute("langfuse.trace_id", langfuseTraceId);
        span.setAttribute("messages.count", messages.length);

        // A persistent container for the state of our system
        const ctx = new SystemContext(locationContext, messages);

        // A loop that continues until we have an answer or we've taken maxSteps actions
        while (ctx.getStep() < maxSteps) {
          span.setAttribute("agent.current_step", ctx.getStep());

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
              const searchHistoryEntry = await searchAndScrape(
                nextAction.query,
                messages,
                langfuseTraceId,
              );

              // Report the combined search and scrape results
              ctx.reportSearch(searchHistoryEntry);

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
                  error:
                    error instanceof Error ? error.message : "Search failed",
                });
              }
              Sentry.captureException(error, {
                contexts: {
                  agent_loop: {
                    step: stepIndex,
                    action_type: "search",
                    query: nextAction.query,
                    user_query: userQuery,
                  },
                },
              });
              throw error;
            }
          } else if (nextAction.type === "answer") {
            span.setAttribute("agent.final_action", "answer");
            return answerQuestion(ctx, {
              langfuseTraceId,
              onFinish,
            });
          }

          // We increment the step counter
          ctx.incrementStep();
        }

        // If we've taken maxSteps actions and still don't have an answer,
        // we ask the LLM to give its best attempt at an answer
        span.setAttribute("agent.final_action", "max_steps_reached");
        return answerQuestion(ctx, {
          isFinal: true,
          langfuseTraceId,
          onFinish,
        });
      } catch (error) {
        Sentry.captureException(error, {
          contexts: {
            agent_loop: {
              user_query: userQuery,
              max_steps: maxSteps,
              langfuse_trace_id: langfuseTraceId,
            },
          },
        });
        throw error;
      }
    },
  );
};
