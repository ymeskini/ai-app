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
    };

/**
 * Convert OurMessageAnnotation to a serializable format
 */
export function serializeAnnotation(
  annotation: OurMessageAnnotation,
): SerializableMessageAnnotation {
  if (annotation.type === "NEW_ACTION") {
    return {
      type: annotation.type,
      action: {
        type: annotation.action.type,
        title: annotation.action.title,
        reasoning: annotation.action.reasoning,
      },
    };
  } else if (annotation.type === "ACTION_UPDATE") {
    return {
      type: annotation.type,
      stepIndex: annotation.stepIndex,
      status: annotation.status,
      error: annotation.error,
    };
  } else if (annotation.type === "PLANNING") {
    return {
      type: annotation.type,
      title: annotation.title,
      reasoning: annotation.reasoning,
    };
  } else if (annotation.type === "QUERIES_GENERATED") {
    return {
      type: annotation.type,
      plan: annotation.plan,
      queries: annotation.queries,
    };
  } else if (annotation.type === "SEARCH_UPDATE") {
    return {
      type: annotation.type,
      queryIndex: annotation.queryIndex,
      query: annotation.query,
      status: annotation.status,
      error: annotation.error,
    };
  } else {
    // This should never happen with proper typing, but provides a fallback
    throw new Error(`Unknown annotation type`);
  }
}
