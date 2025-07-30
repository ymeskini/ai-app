Now that we know the shape of our system's shared context, and the general design for our system, we need to implement perhaps its most important function.

We need a function for choosing the correct next action among several alternatives.

The next action will be one of:

- `search`: Search the web for more information
- `scrape`: Scrape a URL
- `answer`: Answer the user's question and complete the loop

We'll implement this in the `getNextAction` function.

### Structuring The LLM's Outputs

We are, of course, going to be asking an LLM to choose the next action for us. This means we're going to need a very structured response from the LLM: one of three possible objects:

```ts
export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export type Action =
  | SearchAction
  | ScrapeAction
  | AnswerAction;
```

To get this working, we can use the [Structured Outputs](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk) technique from my Vercel AI SDK tutorial.

We'll pass a zod schema to the LLM, and it will return an object that matches the schema.

```ts
import { z } from "zod";

export const actionSchema = z.union([
  z.object({
    type: z
      .literal("search")
      .describe("Search the web for more information"),
    query: z
      .string()
      .describe("The query to search for"),
  }),
  z.object({
    type: z.literal("scrape").describe("Scrape a URL"),
    urls: z
      .array(z.string())
      .describe("The URLs to scrape"),
  }),
  z.object({
    type: z
      .literal("answer")
      .describe(
        "Answer the user's question and complete the loop",
      ),
  }),
]);
```

#### Beware `z.union`

However, `z.union` is often a trap when working with LLMs.

Under the hood, Zod is translated into JSON schema before being passed to the LLM. `z.union` is translated into a `oneOf` array.

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": { "const": "search" },
        "query": { "type": "string" }
      },
      "required": ["type", "query"]
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "scrape" },
        "urls": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["type", "urls"]
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "answer" }
      },
      "required": ["type"]
    }
  ]
}
```

`oneOf` appears to be pretty tricky for LLMs to parse. Instead, I recommend using a single `type` field, and then providing the other fields as optional:

```ts
import { z } from "zod";

export const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Required if type is 'scrape'.",
    )
    .optional(),
});
```

### Implementing `getNextAction`

We can use `generateObject` to generate an object that matches the schema. We'll put in a basic system prompt for now, and then we'll add more context as we go along.

```ts
import { generateObject } from "ai";

export const getNextAction = async (
  context: SystemContext,
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    prompt: `
You are a helpful assistant that can search the web, scrape a URL, or answer the user's question.

Here is the context:

${context.getQueryHistory()}

${context.getScrapeHistory()}
    `,
  });

  return result.object;
};
```

`result.object` will be an object that matches the schema.

## Steps To Complete

- Create the `getNextAction` function, with all required types and schemas.
- Take a look at our existing `streamText` call and use its system prompt as inspiration for the `getNextAction` prompt.
