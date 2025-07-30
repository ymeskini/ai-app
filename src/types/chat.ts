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
export type SerializableMessageAnnotation = {
  type: string;
  action: {
    type: string;
    title: string;
    reasoning: string;
    query?: string;
    urls?: string[];
  };
};

/**
 * Convert OurMessageAnnotation to a serializable format
 */
export function serializeAnnotation(annotation: OurMessageAnnotation): SerializableMessageAnnotation {
  return {
    type: annotation.type,
    action: {
      type: annotation.action.type,
      title: annotation.action.title,
      reasoning: annotation.action.reasoning,
      ...(annotation.action.type === "search" && { query: annotation.action.query }),
      ...(annotation.action.type === "scrape" && { urls: annotation.action.urls }),
    },
  };
}