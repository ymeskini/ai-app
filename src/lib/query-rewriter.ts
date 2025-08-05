import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";
import { type SystemContext } from "./system-context";

const queryRewriterSchema = z.object({
  plan: z
    .string()
    .describe("A detailed plan of how to approach answering the question."),
  queries: z
    .array(z.string())
    .describe("A list of search queries to execute in parallel."),
});

type QueryRewriterResult = z.infer<typeof queryRewriterSchema>;

export const queryRewriter = async (
  context: SystemContext,
  opts: { langfuseTraceId?: string } = {},
): Promise<QueryRewriterResult> => {
  const result = await generateObject({
    model,
    schema: queryRewriterSchema,
    system: `
    You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

    First, analyze the question thoroughly:
    - Break down the core components and key concepts
    - Identify any implicit assumptions or context needed
    - Consider what foundational knowledge might be required
    - Think about potential information gaps that need filling

    Then, develop a strategic research plan that:
    - Outlines the logical progression of information needed
    - Identifies dependencies between different pieces of information
    - Considers multiple angles or perspectives that might be relevant
    - Anticipates potential dead-ends or areas needing clarification

    Finally, translate this plan into a list of 3-5 search queries that:
    - Are specific and focused (avoid broad queries that return general information)
    - Are written in natural language without Boolean operators (no AND/OR)
    - Progress logically from foundational to specific information
    - Build upon each other in a meaningful way

    Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.
    `,
    prompt: `Message History:
${context.getMessageHistory()}

Based on this context, create a research plan and generate search queries that will help answer the question.

Here is the search history:

${context.getSearchHistory()}

${context.getLastFeedback() ? `\nLast feedback from evaluation:\n${context.getLastFeedback()}` : ""}
`,
    experimental_telemetry: opts.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "query-rewriter",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  if (result.usage) {
    context.reportUsage("query-rewriter", result.usage);
  }

  return result.object;
};
