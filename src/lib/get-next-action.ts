import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";

// Action types
export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = ContinueAction | AnswerAction;

// Message annotation type for progress tracking
export type OurMessageAnnotation =
  | {
      type: "NEW_ACTION";
      action: Action;
    }
  | {
      type: "ACTION_UPDATE";
      stepIndex: number;
      status: "loading" | "completed" | "error";
      error?: string;
    }
  | {
      type: "PLANNING";
      title: string;
      reasoning: string;
    }
  | {
      type: "QUERIES_GENERATED";
      plan: string;
      queries: string[];
    }
  | {
      type: "SEARCH_UPDATE";
      queryIndex: number;
      query: string;
      status: "loading" | "completed" | "error";
      error?: string;
    };

// Zod schema for structured output
export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Need more information', 'Finalizing answer'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z.enum(["continue", "answer"]).describe(
    `The type of action to take.
      - 'continue': Continue searching for more information to answer the question.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
});

export const getNextAction = async (
  context: SystemContext,
  userQuery: string,
  langfuseTraceId: string,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "get-next-action",
      metadata: {
        langfuseTraceId,
      },
    },
    prompt: `
You are a helpful AI assistant that determines whether to continue searching or provide an answer.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## DECISION MAKING
Your goal is to determine whether we need to continue searching for more information or if we have enough to answer the user's question. You have two options:

1. **continue** - We need more information to properly answer the question
2. **answer** - We have sufficient information to provide a comprehensive answer

## CONTEXT ANALYSIS

${context.getMessagesHistory()}

Current User's Question: "${userQuery}"

Search History (includes both search results and content summaries):
${context.getSearchHistory()}

## DECISION CRITERIA

Based on the context above, determine the next action:

- If there's no search history and the question requires web information → "continue"
- If you have search results with content summaries that sufficiently answer the question → "answer"
- If existing information is insufficient or outdated → "continue"
- If you have comprehensive, relevant information → "answer"

Provide your decision with a clear title and reasoning.
    `,
  });

  // Type assertion to ensure we return the correct type
  const action = result.object as Action;

  // Validate that required fields are present for all actions
  if (!action.title) {
    throw new Error("Title is required for all actions");
  }

  if (!action.reasoning) {
    throw new Error("Reasoning is required for all actions");
  }

  // No additional validation needed for continue/answer actions

  return action;
};
