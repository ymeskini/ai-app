We've got a basic Evalite set up working but we're not actually using it to test our application.

We need to find a way to make our application testable - rather to extract out the parts that need to be evaluated.

If we look at our existing `/api/chat` route, there are lots of things we don't need to worry about in our evaluation.

- Authentication
- Persisting the chats to the database
- Tracing the request with Langfuse

All we really need is a function that takes in an array of `Message` objects and returns something we can evaluate.

However, our existing function is really tied in to our existing API route. So we need to be smart about how we extract out the function.

## Steps To Complete

My preferred method would be to do it in two steps:

- Create a custom `streamFromDeepSearch` function which calls `streamText`, but allows us to inject things like `onFinish`, where our database persistence logic will go:

```ts
import {
  streamText,
  type Message,
  type TelemetrySettings,
} from "ai";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<
    typeof streamText
  >[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: ``, // existing system prompt
    tools: {}, // existing tools
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
```

This also handles the telemetry settings for us.

- We can then use this function in our existing API route, and pass in the `onFinish` function to handle the database persistence.

- We can then create an `askDeepSearch` function to use in Evalite.

```ts
import type { Message } from "ai";

export async function askDeepSearch(
  messages: Message[],
) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
```

This is a great way to keep our existing functionality, and also to make our application evaluatable.

- Finally, let's use the `askDeepSearch` function in Evalite. Find the existing eval (in an `.eval.ts` file somewhere) and remove the demo code (including the `Levenshtein` scorer).

- Replace it with our new `askDeepSearch` function.

```ts
import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of Next.js 14?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [],
});
```

- We can now take a look at Evalite (on `localhost:3006`) to see our results.
