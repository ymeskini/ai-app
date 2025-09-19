import { generateObject } from "ai";
import { z } from "zod";
import { model } from "../../lib/model";
import type { SystemContext } from "./system-context";

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Continuing search', 'Providing answer'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z.enum(["continue", "answer"]).describe(
    `The type of action to take.
      - 'continue': Continue searching for more information.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  feedback: z
    .string()
    .optional()
    .describe(
      "Required only when type is 'continue'. Detailed feedback about what information is missing or what needs to be improved in the search. This will be used to guide the next search iteration.",
    ),
});

export type Action = z.infer<typeof actionSchema>;

export const getNextAction = async (
  context: SystemContext,
  opts: { langfuseTraceId?: string } = {},
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
    You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

    PROCESS:
    1. Identify ALL information explicitly requested in the original research goal
    2. Analyze what specific information has been successfully retrieved in the search results
    3. Identify ALL information gaps between what was requested and what was found
    4. For entity-specific gaps: Create targeted queries for each missing attribute of identified entities
    5. For general knowledge gaps: Create focused queries to find the missing conceptual information

    When providing feedback (only required when type is 'continue'):
    - Be specific about what information is missing
    - Explain why the current information is insufficient
    - Suggest what kind of information would be most helpful
    - Consider both factual gaps and conceptual understanding gaps
    `,
    prompt: `Message History:
${context.getMessageHistory()}

Based on this context, choose the next action:
1. If you need more information, use 'continue' and provide detailed feedback about what's missing.
2. If you have enough information to answer the question, use 'answer'.

Remember:
- Only use 'continue' if you need more information, and provide detailed feedback.
- Use 'answer' when you have enough information to provide a complete answer.
- Feedback is only required when choosing 'continue'.

Here is the search history:

${context.getSearchHistory()}
`,
    experimental_telemetry: opts.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "get-next-action",
          metadata: {
            langfuseTraceId: opts.langfuseTraceId,
          },
        }
      : undefined,
  });

  context.reportUsage("get-next-action", result.usage);

  return result.object;
};
