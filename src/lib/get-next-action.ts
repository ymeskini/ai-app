import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";

// Action types
export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | AnswerAction;

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
    };

// Zod schema for structured output
export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z.enum(["search", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information and scrape the most relevant URLs.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
  userQuery: string,
  langfuseTraceId?: string,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    ...(langfuseTraceId && {
      experimental_telemetry: {
        isEnabled: true,
        functionId: "get-next-action",
        metadata: {
          langfuseTraceId: langfuseTraceId,
        },
      },
    }),
    prompt: `
You are a helpful AI assistant that can search the web or answer the user's question.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## PLANNING INSTRUCTIONS
Your goal is to determine the next action to take in order to answer the user's question effectively. You have two options:

1. **search** - Search the web for information and automatically scrape the most relevant URLs to get detailed content
2. **answer** - Answer the user's question and complete the loop

## RESEARCH WORKFLOW
When users ask for "current", "latest", "recent", or "up-to-date" information, you should search first.

The search action will automatically:
- Search for relevant web pages
- Scrape the most relevant URLs to get detailed content
- Provide both search snippets and full scraped content

Decision-making process:
1. If you haven't searched yet and need current/web information → choose "search"
2. If you have sufficient information from previous searches → choose "answer"
3. If existing information is insufficient and you need more specific data → choose "search" (with a refined query)

## CONTEXT ANALYSIS

${context.getMessagesHistory()}

Current User's Question: "${userQuery}"

Search History (includes both search results and scraped content):
${context.getSearchHistory()}

## DECISION CRITERIA

Based on the context above, determine the next action:

- If there's no search history and the question requires web information → "search"
- If you have search results with scraped content that sufficiently answers the question → "answer"
- If existing information is insufficient and you need more specific data → "search" (with a refined query)

Provide your decision with the appropriate parameters.
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

  // Validate that required fields are present based on action type
  if (action.type === "search" && !action.query) {
    throw new Error("Query is required for search action");
  }

  return action;
};
