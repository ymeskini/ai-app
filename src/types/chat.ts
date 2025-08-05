import type { OurMessageAnnotation } from "~/lib/get-next-action";

/**
 * Type for the finish result from streamText
 */
export interface StreamTextFinishResult {
  readonly text: string;
  readonly reasoning?: string;
  readonly reasoningDetails?: Array<unknown>;
  readonly files?: Array<unknown>;
  readonly usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  readonly finishReason?: string;
  readonly logprobs?: unknown;
  readonly response?: {
    id?: string;
    timestamp?: Date;
    modelId?: string;
  };
  readonly warnings?: Array<unknown>;
  readonly steps?: Array<unknown>;
}

/**
 * Type for message annotations that can be serialized to JSON
 */
export type SerializableMessageAnnotation =
  | {
      type: "NEW_ACTION";
      action: {
        type: string;
        title: string;
        reasoning: string;
        feedback: string;
      };
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
    };

/**
 * Convert OurMessageAnnotation to a serializable format
 */
export function serializeAnnotation(
  annotation: OurMessageAnnotation,
): SerializableMessageAnnotation {
  switch (annotation.type) {
    case "NEW_ACTION":
      return {
        type: annotation.type,
        action: {
          type: annotation.action.type,
          title: annotation.action.title,
          reasoning: annotation.action.reasoning,
          feedback: annotation.action.feedback,
        },
      };
    case "ACTION_UPDATE":
      return {
        type: annotation.type,
        stepIndex: annotation.stepIndex,
        status: annotation.status,
        error: annotation.error,
      };
    case "PLANNING":
      return {
        type: annotation.type,
        title: annotation.title,
        reasoning: annotation.reasoning,
      };
    case "QUERIES_GENERATED":
      return {
        type: annotation.type,
        plan: annotation.plan,
        queries: annotation.queries,
      };
    case "SEARCH_UPDATE":
      return {
        type: annotation.type,
        queryIndex: annotation.queryIndex,
        query: annotation.query,
        status: annotation.status,
        error: annotation.error,
      };
    case "EVALUATOR_FEEDBACK":
      return {
        type: annotation.type,
        feedback: annotation.feedback,
        actionType: annotation.actionType,
      };
    default:
      // This should never happen with proper typing, but provides a fallback
      const exhaustiveCheck: never = annotation;
      throw new Error(
        `Unknown annotation type: ${JSON.stringify(exhaustiveCheck)}`,
      );
  }
}
