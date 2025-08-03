import { streamText, type Message } from "ai";
import { model } from "~/lib/model";
import type { SystemContext } from "~/lib/system-context";
import { formatMessageHistory } from "~/lib/format-message-history";
import type { StreamTextFinishResult } from "~/types/chat";

export const answerQuestion = (
  context: SystemContext,
  userQuery: string,
  messages: Message[],
  options: {
    langfuseTraceId: string;
    onFinish: (finishResult: StreamTextFinishResult) => void;
    isFinal?: boolean;
  },
) => {
  const { isFinal = false, langfuseTraceId, onFinish } = options;

  const systemPrompt = `
You are a helpful AI assistant that provides comprehensive and accurate answers based on web search and scraping data.

Current date and time: ${new Date().toLocaleString()}

${context.getLocationContext()}

## INSTRUCTIONS

Your task is to answer the user's question using the information gathered from web searches and scraped content.

${
  isFinal
    ? `IMPORTANT: This is your final attempt. You may not have all the information you need, but you must provide your best possible answer based on the available data. If information is incomplete or missing, acknowledge this in your response and provide what insights you can.`
    : `Use the comprehensive information from both search results and scraped content to provide a detailed, accurate, and well-sourced answer.`
}

## RESPONSE GUIDELINES

1. **Comprehensive Coverage**: Address all aspects of the user's question
2. **Source Citations**: Always cite your sources with inline links using the format [<source name>](URL) where <source name> is descriptive and show the name of the source.
3. **Accuracy**: Base your answer on the factual information from the scraped content
4. **Clarity**: Organize your response with clear structure and headings when appropriate
5. **Currency**: When discussing current events or recent information, mention the date context
6. **Transparency**: If information is conflicting across sources, acknowledge this and present different perspectives

## MARKDOWN LINK FORMATTING

You must format all links as inline markdown links using the exact syntax: \`[link text](URL)\`

**Requirements:**
- Always use inline link format, never reference-style links
- Link text should be descriptive and meaningful
- URLs must be complete and functional
- No spaces between the closing bracket \`]\` and opening parenthesis \`(\`

**Examples:**
✅ **Correct:** According to the [latest research from Stanford](https://cs229.stanford.edu/), machine learning algorithms continue to evolve.
❌ **Incorrect:** According to the latest research from Stanford[1], machine learning algorithms continue to evolve.

## CONVERSATION CONTEXT

${formatMessageHistory(messages)}

## CURRENT USER'S QUESTION

"${userQuery}"

## SEARCH HISTORY (includes search results and scraped content)

${context.getSearchHistory()}

## YOUR RESPONSE

Provide a comprehensive answer to the user's question based on the information above.
`.trim();

  return streamText({
    model,
    prompt: systemPrompt,
    onFinish,
    experimental_telemetry: {
      isEnabled: true,
      functionId: isFinal ? "answer-question-final" : "answer-question",
      metadata: {
        langfuseTraceId: langfuseTraceId,
      },
    },
  });
};
