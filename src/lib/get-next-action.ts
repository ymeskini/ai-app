import { generateObject, type Message } from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";
import { formatMessageHistory } from "~/lib/format-message-history";

// Action types
export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | ScrapeAction | AnswerAction;

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
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
  userQuery: string,
  messages: Message[],
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
You are a helpful AI assistant that can search the web, scrape URLs, or answer the user's question.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## PLANNING INSTRUCTIONS
Your goal is to determine the next action to take in order to answer the user's question effectively. You have three options:

1. **search** - Search the web for more information
2. **scrape** - Scrape specific URLs to get detailed content
3. **answer** - Answer the user's question and complete the loop

## RESEARCH WORKFLOW
When users ask for "current", "latest", "recent", or "up-to-date" information, you should search first.

IMPORTANT RULE: You MUST use the scrape action after using the search action. This is mandatory - search snippets alone are not sufficient.

Decision-making process:
1. If you haven't searched yet and need current/web information → choose "search"
2. If you have search results but haven't scraped the URLs yet → choose "scrape"
3. If you have sufficient information from both search and scrape → choose "answer"

## SOURCE PRIORITIZATION
When selecting URLs to scrape, prioritize:
- **Authoritative Sources**: Government websites, official organization pages, academic institutions
- **Established Media**: Reputable news organizations with editorial standards
- **Expert Analysis**: Industry publications, professional journals, recognized experts
- **Primary Sources**: Official statements, direct quotes, original research
- **Recent Content**: Prefer newer content when dealing with current events or evolving topics

Choose 4-6 URLs minimum per scrape action:
- Prioritize different domains/websites for diverse perspectives
- Include authoritative sources when available
- Mix official sources with analysis/opinion pieces when relevant
- Avoid obviously biased or unreliable sources

## CONTEXT ANALYSIS

${formatMessageHistory(messages)}

Current User's Question: "${userQuery}"

Query History:
${context.getQueryHistory()}

Scrape History:
${context.getScrapeHistory()}

## DECISION CRITERIA

Based on the context above, determine the next action:

- If there's no query history and the question requires web information → "search"
- If there are search results but no corresponding scrape results → "scrape" (with 4-6 URLs from search results)
- If you have both search and scrape data that sufficiently answers the question → "answer"
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

  if (action.type === "scrape" && (!action.urls || action.urls.length === 0)) {
    throw new Error("URLs are required for scrape action");
  }

  return action;
};
