import { generateText } from "ai";
import type { Message } from "ai";
import { summarizerModel } from "~/lib/model";
import { cacheWithRedis } from "~/server/redis/redis";
import { formatMessageHistory } from "~/lib/format-message-history";
import * as Sentry from "@sentry/nextjs";

export interface URLSummaryInput {
  query: string;
  url: string;
  title: string;
  snippet: string;
  scrapedContent: string;
  conversationHistory: Message[];
}

export interface URLSummary {
  url: string;
  title: string;
  summary: string;
}

/**
 * Summarize URL content using a specialized LLM
 * Uses caching and telemetry
 */
const _summarizeURL = async (
  input: URLSummaryInput,
  langfuseTraceId: string,
): Promise<URLSummary> => {
  const { query, url, title, snippet, scrapedContent, conversationHistory } =
    input;

  // If there's no scraped content, return the snippet as summary
  if (!scrapedContent || scrapedContent.trim().length === 0) {
    return {
      url,
      title,
      summary: snippet,
    };
  }

  const prompt = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.

## Research Context

**Research Topic/Query:** "${query}"

**Conversation History:**
${formatMessageHistory(conversationHistory)}

## Source Material

**Source:** ${title}
**URL:** ${url}
**Initial Snippet:** ${snippet}

**Full Content:**
${scrapedContent}

## Your Task

Create a detailed synthesis of the above content that relates to the research topic "${query}". Focus on extracting and organizing information that would be valuable for answering the user's question in the context of their conversation history.`;

  try {
    const result = await generateText({
      model: summarizerModel,
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "summarize-url",
        metadata: {
          langfuseTraceId,
          url,
          contentLength: scrapedContent.length,
        },
      },
    });

    return {
      url,
      title,
      summary: result.text,
    };
  } catch (error) {
    Sentry.captureException(error);

    // Fall back to snippet if summarization fails
    return {
      url,
      title,
      summary: snippet,
    };
  }
};

/**
 * Cached version of summarizeURL to avoid expensive re-summarization
 */
export const summarizeURL = cacheWithRedis("summarizeURL", _summarizeURL);
