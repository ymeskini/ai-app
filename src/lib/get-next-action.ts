import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";

// Action types
export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
  feedback: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
  feedback: string;
}

export type Action = ContinueAction | AnswerAction;

// Source type for displaying in the frontend
export interface SourceResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

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
    }
  | {
      type: "EVALUATOR_FEEDBACK";
      feedback: string;
      actionType: "continue" | "answer";
    }
  | {
      type: "SOURCES_FOUND";
      stepIndex: number;
      sources: SourceResult[];
    };

// Zod schema for structured output
export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Need more information', 'Finalizing answer'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  feedback: z
    .string()
    .optional()
    .describe(
      "Required only when type is 'continue'. Detailed feedback about what information is missing or what needs to be improved in the search. This will be used to guide the next search iteration.",
    ),
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
You are a research query optimizer and evaluator. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted feedback for each missing attribute of identified entities
5. For general knowledge gaps: Create focused feedback to find the missing conceptual information

## CONTEXT ANALYSIS

${context.getMessagesHistory()}

Current User's Question: "${userQuery}"

Search History (what we already know):
${context.getSearchHistory()}

## EVALUATION CRITERIA

**Choose "continue" if:**
- There are significant information gaps that prevent a comprehensive answer
- The search results are outdated or insufficient for the question's requirements
- Key entities, concepts, or data points mentioned in the question are missing
- The information lacks depth, specificity, or recent updates needed for accuracy

**Choose "answer" if:**
- All major components of the question have been addressed with sufficient detail
- The search results provide comprehensive, up-to-date, and relevant information
- Any minor gaps wouldn't significantly impact the quality of the final answer

## FEEDBACK REQUIREMENTS

**For "continue" decisions, provide detailed feedback that includes:**
- Specific information gaps that need to be filled
- Missing entities, attributes, or data points
- Areas needing more recent or detailed information
- Suggestions for what types of information would help complete the research

**For "answer" decisions, provide feedback that includes:**
- Confirmation of what key information has been successfully gathered
- Brief assessment of information quality and completeness
- Any minor limitations or caveats to note in the final answer

Your feedback will be used to optimize future search queries, so be specific and actionable.
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

  if (!action.feedback) {
    throw new Error("Feedback is required for all actions");
  }

  return action;
};
