There's another weakness in our system that I want to address.

This is that no matter what message the user sends us, our system immediately goes into our querying, scraping, summarizing loop.

This is going to be a problem for a whole category of user responses:

- "Hello!" - random greetings
- "Tell me about something" - vague requests
- "What's your favourite type of bat?" - ambiguous questions. Does the user mean a cricket bat? A baseball bat? A flying rodent?

We need to add a step to our system before we enter our querying loop to make sure the question is clearly defined.

## The Setup

Similarly to the guardrails exercise, we'll use a separate LLM to check if the question is clear.

Also similarly to the guardrails exercise, we only need to pass in the message history to the LLM, along with a system prompt.

```ts
import { generateObject } from "ai";
import { z } from "zod";

export const checkIfQuestionNeedsClarification =
  async (ctx: SystemContext) => {
    const messageHistory: string =
      ctx.getMessageHistory();

    const { object } = await generateObject({
      model,
      schema: z.object({
        needsClarification: z.boolean(),
        reason: z
          .string()
          .optional()
          .describe(
            "If needsClarification is true, explain why.",
          ),
      }),
      system: "", // TODO: Add the system prompt
      prompt: messageHistory,
    });

    return object;
  };
```

We can use a separate model for this - or we can use the same model.

## The Prompt

Here's another prompt I iterated on with Claude 4 Sonnet. Feel free to use it or discard it and try to create your own:

```md
You are a clarification assessment agent for a DeepSearch system. Your job is to determine whether a user's question requires clarification before conducting a comprehensive search and response.

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
- Keep reasons specific and actionable for the user
```

## Replying To The User

If the question does need clarification, we need to respond to the user with a clarification request.

To me, it makes sense to use yet another LLM call for this, passing the message history and the reason for the clarification.

I've added an extremely basic system prompt here, but you can feel free to iterate.

```ts
const clarificationResult =
  await checkIfQuestionNeedsClarification(ctx);

if (clarificationResult.needsClarification) {
  return streamText({
    system: `
      You are a clarification agent.
      Your job is to ask the user for clarification on their question.`,
    prompt: `Here is the message history:

        ${ctx.getMessageHistory()}

        And here is why the question needs clarification:

        ${clarificationResult.reason}

        Please reply to the user with a clarification request.
      `,
    // ...other properties
  });
}
```

## Steps To Complete

- Find the existing place we're running the agent loop
- Add a new function to check if a question needs clarification
- Add the new function to the agent loop (after the guardrails, if they exist) that checks if the question needs clarification
- Add a new function to the agent loop that replies to the user with a clarification request
- Hook up any LLM calls to Langfuse, as seen elsewhere in the agent loop
- Run the app to see if it works
