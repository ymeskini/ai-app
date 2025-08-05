import { generateObject, streamText } from "ai";
import { z } from "zod";
import type { SystemContext } from "~/lib/system-context";
import { model } from "~/lib/model";
import type { StreamTextFinishResult } from "~/types/chat";

const clarificationSchema = z.object({
  needsClarification: z.boolean(),
  reason: z
    .string()
    .optional()
    .describe("If needsClarification is true, explain why."),
});

const CLARIFICATION_SYSTEM_PROMPT = `You are a clarification assessment agent for a DeepSearch system. Your job is to determine whether a user's question requires clarification before conducting a comprehensive search and response.

## Your Task

Analyze the user's question and determine if it needs clarification. Respond with a JSON object in this exact format:

{ "needsClarification": boolean, "reason": "string" }

- Include 'reason' only if 'needsClarification' is true
- Keep the reason concise and specific

## When to Request Clarification

Request clarification if ANY of the following apply:

### 1. Ambiguous Premise or Scope

- The core question is vague or could be interpreted multiple ways
- The scope is too broad without specific focus
- Key terms are ambiguous or undefined

**Examples:**

- "What's the best approach?" (approach to what?)
- "How do I improve it?" (improve what specifically?)
- "Tell me about the situation" (which situation?)

### 2. Unknown or Ambiguous References

- Unfamiliar names of people, organizations, or entities
- Unclear geographic references or place names
- Ambiguous pronouns or references without context
- Technical terms or jargon that could have multiple meanings

**Examples:**

- "What's the latest on the Johnson case?" (which Johnson, what type of case?)
- "How is the company performing?" (which company?)
- "What happened in the incident?" (which incident?)

### 3. Missing Critical Context

- Time frame is unclear when it matters for accuracy
- The user's specific use case or context would significantly affect the answer
- Important constraints or requirements are not specified

**Examples:**

- "What are the current regulations?" (in which jurisdiction, for what industry?)
- "How much does it cost?" (what specific product/service?)
- "What's the weather like?" (where and when?)

### 4. Contradictory or Incomplete Information

- The question contains contradictory elements
- Essential information appears to be missing
- The question seems to assume facts not in evidence

### 5. Multiple Possible Interpretations

- The question could reasonably be asking for several different types of information
- Key terms could refer to different concepts in different contexts

## When NOT to Request Clarification

Do NOT request clarification for:

- Questions that are clear and searchable, even if broad
- Common names or well-known entities
- Questions where reasonable assumptions can be made
- Topics where a comprehensive overview would be valuable
- Questions that are self-contained and unambiguous

**Examples of questions that DON'T need clarification:**

- "What are the health benefits of meditation?"
- "How does climate change affect sea levels?"
- "What is the current state of artificial intelligence research?"
- "What happened in the 2024 US presidential election?"

## Response Format

Always respond with valid JSON only. No additional text or explanation.

**If clarification is needed:**

{
"needsClarification": true,
"reason": "The question refers to 'the recent merger' but doesn't specify which companies or industry"
}

**If no clarification is needed:**

{ "needsClarification": false }

## Guidelines

- Be conservative - only request clarification when it would significantly improve the search results
- Focus on clarifications that would change the research approach or sources
- Prioritize the most critical missing information
- Keep reasons specific and actionable for the user`;

export const checkIfQuestionNeedsClarification = async (
  ctx: SystemContext,
) => {
  const messageHistory: string = ctx.getMessagesHistory();

  const { object } = await generateObject({
    model,
    schema: clarificationSchema,
    system: CLARIFICATION_SYSTEM_PROMPT,
    prompt: messageHistory,
  });

  return object;
};

export const generateClarificationResponse = (
  ctx: SystemContext,
  reason: string,
  onFinish?: (finishResult: StreamTextFinishResult) => void,
) => {
  const messageHistory = ctx.getMessagesHistory();

  const result = streamText({
    model,
    system: `You are a clarification agent for a DeepSearch system.
Your job is to ask the user for clarification on their question.

Be helpful and friendly while asking for the specific information needed.
Keep your response concise and focused on the most important missing details.
Explain why you need this information to provide a better search and response.`,
    prompt: `Here is the message history:

${messageHistory}

And here is why the question needs clarification:

${reason}

Please reply to the user with a clarification request that explains what specific information you need and why it would help you provide a better response.`,
    onFinish: (finishResult) => {
      if (onFinish) {
        onFinish(finishResult);
      }
    },
  });

  return result;
};