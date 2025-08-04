import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";

// Zod schema for structured output
export const queryRewriterSchema = z.object({
  plan: z
    .string()
    .describe(
      "A detailed research plan explaining the strategy for answering the user's question. Include the logical progression and reasoning behind the query choices.",
    ),
  queries: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe(
      "A numbered list of 3-5 sequential search queries that are specific, focused, and build upon each other. Write in natural language without Boolean operators.",
    ),
});

type QueryRewriterResult = z.infer<typeof queryRewriterSchema>;

export const queryRewriter = async (
  context: SystemContext,
  userQuery: string,
  langfuseTraceId: string,
): Promise<QueryRewriterResult> => {
  const result = await generateObject({
    model,
    schema: queryRewriterSchema,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "query-rewriter",
      metadata: {
        langfuseTraceId,
      },
    },
    prompt: `
You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## ANALYSIS PHASE
First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

## PLANNING PHASE
Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

## QUERY GENERATION PHASE
Finally, translate this plan into a numbered list of 3-5 sequential search queries that:

- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.

## CONTEXT ANALYSIS

${context.getMessagesHistory()}

Current User's Question: "${userQuery}"

Search History (what we already know):
${context.getSearchHistory()}

## INSTRUCTIONS
Based on the context above, create a research plan and generate 3-5 search queries. If there's already search history, build upon it with more specific or complementary queries. Focus on gaps in the current information or areas that need more recent/detailed data.

Provide both a detailed plan and the specific queries to execute.
    `,
  });

  // Type assertion to ensure we return the correct type
  const queryResult = result.object;

  // Validate that we have the required fields
  if (!queryResult.plan) {
    throw new Error("Plan is required from query rewriter");
  }

  if (!queryResult.queries || queryResult.queries.length === 0) {
    throw new Error("At least one query is required from query rewriter");
  }

  if (queryResult.queries.length < 3 || queryResult.queries.length > 5) {
    throw new Error("Query rewriter must return between 3-5 queries");
  }

  return queryResult;
};
