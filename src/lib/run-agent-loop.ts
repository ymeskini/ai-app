import type { StreamTextResult, Message } from "ai";
import * as Sentry from "@sentry/nextjs";
import {
  getNextAction,
  type OurMessageAnnotation,
  type SourceResult,
} from "~/lib/get-next-action";
import { queryRewriter } from "~/lib/query-rewriter";
import { answerQuestion } from "~/lib/answer-question";
import { SystemContext } from "~/lib/system-context";
import type { StreamTextFinishResult } from "~/types/chat";
import { searchAndScrape } from "~/lib/search-and-scrape";
import { checkIsSafe } from "~/lib/guardrails";

/**
 * Generate favicon URL from a domain
 */
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return "";
  }
}

/**
 * Main agent loop that continues until we have an answer or reach max steps
 */
export const runAgentLoop = async (
  userQuery: string,
  messages: Message[],
  locationContext: string,
  maxSteps = 3,
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

        // Check if the query is safe to process
        try {
          const safetyCheck = await checkIsSafe(ctx);
          span.setAttribute("guardrail.classification", safetyCheck.classification);
          
          if (safetyCheck.classification === "refuse") {
            span.setAttribute("guardrail.refusal_reason", safetyCheck.reason);
            
            // Return a refusal response using answerQuestion with a safety message
            const refusedCtx = new SystemContext(locationContext, [
              ...messages,
              {
                id: "safety-refusal",
                role: "assistant",
                content: `I cannot assist with this request as it may violate safety guidelines. ${safetyCheck.reason ? `Reason: ${safetyCheck.reason}` : ""} Please rephrase your question or ask about something else I can help with.`,
              }
            ]);
            
            return answerQuestion(refusedCtx, {
              langfuseTraceId,
              onFinish,
            });
          }
        } catch (guardrailError) {
          // If guardrail check fails, log error but continue processing (fail open)
          Sentry.captureException(guardrailError, {
            contexts: {
              guardrail: {
                user_query: userQuery,
                message_count: messages.length,
                langfuse_trace_id: langfuseTraceId,
              },
            },
          });
          span.setAttribute("guardrail.error", true);
          // Continue with normal processing if guardrail check fails
        }

        // A loop that continues until we have an answer or we've taken maxSteps actions
        while (ctx.getStep() < maxSteps) {
          span.setAttribute("agent.current_step", ctx.getStep());

          const stepIndex = ctx.getStep();

          // First, generate plan and queries using queryRewriter
          // Send planning annotation
          if (writeMessageAnnotation) {
            writeMessageAnnotation({
              type: "PLANNING",
              title: "Creating research plan",
              reasoning:
                "Analyzing the question and generating targeted search queries",
            });
          }

          try {
            // Generate plan and queries using queryRewriter
            const queryResult = await queryRewriter(
              ctx,
              userQuery,
              langfuseTraceId,
            );

            // Send queries generated annotation
            if (writeMessageAnnotation) {
              writeMessageAnnotation({
                type: "QUERIES_GENERATED",
                plan: queryResult.plan,
                queries: queryResult.queries,
              });
            }

            // Execute all queries in parallel
            const searchPromises = queryResult.queries.map(
              async (query, index) => {
                // Send loading annotation for this query
                if (writeMessageAnnotation) {
                  writeMessageAnnotation({
                    type: "SEARCH_UPDATE",
                    queryIndex: index,
                    query,
                    status: "loading",
                  });
                }

                try {
                  const searchHistoryEntry = await searchAndScrape(
                    query,
                    messages,
                    langfuseTraceId,
                  );

                  // Send completed annotation for this query
                  if (writeMessageAnnotation) {
                    writeMessageAnnotation({
                      type: "SEARCH_UPDATE",
                      queryIndex: index,
                      query,
                      status: "completed",
                    });
                  }

                  return searchHistoryEntry;
                } catch (error) {
                  // Send error annotation for this query
                  if (writeMessageAnnotation) {
                    writeMessageAnnotation({
                      type: "SEARCH_UPDATE",
                      queryIndex: index,
                      query,
                      status: "error",
                      error:
                        error instanceof Error
                          ? error.message
                          : "Search failed",
                    });
                  }

                  Sentry.captureException(error, {
                    contexts: {
                      agent_loop: {
                        step: stepIndex,
                        action_type: "search",
                        query,
                        query_index: index,
                        user_query: userQuery,
                      },
                    },
                  });

                  // Return null for failed searches, but don't throw to allow other searches to continue
                  return null;
                }
              },
            );

            // Wait for all searches to complete
            const searchResults = await Promise.all(searchPromises);

            // Report successful search results to context
            searchResults.forEach((result) => {
              if (result) {
                ctx.reportSearch(result);
              }
            });

            // Collect all sources from successful search results and send sources annotation
            const allSources: SourceResult[] = [];
            searchResults.forEach((result) => {
              if (result) {
                result.results.forEach((searchResult) => {
                  allSources.push({
                    title: searchResult.title,
                    url: searchResult.url,
                    snippet: searchResult.snippet,
                    favicon: getFaviconUrl(searchResult.url),
                  });
                });
              }
            });

            // Send sources found annotation (only once per step)
            if (writeMessageAnnotation && allSources.length > 0) {
              writeMessageAnnotation({
                type: "SOURCES_FOUND",
                stepIndex,
                sources: allSources,
              });
            }

            // Now decide whether to continue or answer based on the state of our system
            const nextAction = await getNextAction(
              ctx,
              userQuery,
              langfuseTraceId,
            );

            // Store the feedback in context for future query optimization
            ctx.reportFeedback(nextAction.feedback);

            // Send annotation about the action we chose
            if (writeMessageAnnotation) {
              writeMessageAnnotation({
                type: "NEW_ACTION",
                action: nextAction,
              });

              // Send evaluator feedback annotation
              writeMessageAnnotation({
                type: "EVALUATOR_FEEDBACK",
                feedback: nextAction.feedback,
                actionType: nextAction.type,
              });
            }

            if (nextAction.type === "continue") {
              // Update action status to completed and continue the loop
              if (writeMessageAnnotation) {
                writeMessageAnnotation({
                  type: "ACTION_UPDATE",
                  stepIndex,
                  status: "completed",
                });
              }
            } else if (nextAction.type === "answer") {
              span.setAttribute("agent.final_action", "answer");
              return answerQuestion(ctx, {
                langfuseTraceId,
                onFinish,
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
                  error instanceof Error
                    ? error.message
                    : "Planning or search failed",
              });
            }
            Sentry.captureException(error, {
              contexts: {
                agent_loop: {
                  step: stepIndex,
                  action_type: "planning_and_search",
                  user_query: userQuery,
                },
              },
            });
            throw error;
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
