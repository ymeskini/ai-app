Those of you who are familiar with the capabilities of the current crop of LLM's might be able to spot something. We are using external tools to connect the LLM with search, but there is another option.

Model providers like Google and OpenAI can use search grounding _natively_, to directly connect the LLM with search.

In this exercise, we'll give it a go to see what the results are like.

Make sure you commit your code before starting the exercise - since we may want to revert the code at the end.

## Search Grounding

You can enable search grounding using the AI SDK. This is done by passing in some settings to the model you use.

```ts
import { google } from "@ai-sdk/google";

export const model = google("gemini-2.0-flash-001", {
  useSearchGrounding: true,
});
```

You can then use `streamText` and `generateText` as usual, and pay attention to an extra property on the response: `sources`.

```ts
import { streamText } from "ai";

const response = streamText({
  model,
  prompt: "What is the capital of France?",
});

const sources = await response.sources;
```

The sources are an array of `LanguageModelV1Source`, which looks like this:

```ts
type LanguageModelV1Source = {
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
  providerMetadata?: LanguageModelV1ProviderMetadata;
};
```

## Showing Sources In The Frontend

By default, these sources won't be sent to the frontend. We can modify that by passing in an options object to `result.mergeIntoDataStream`.

```ts
result.mergeIntoDataStream(dataStream, {
  sendSources: true,
});
```

Now, the sources will be sent to the frontend as a `source` part in the message.

Since we're already handling the `tool-invocation` part, we can add a new case to the `ChatMessage` component to handle the `source` part.

```tsx
if (part.type === "source") {
  return <Source part={part} />;
}
```

## Steps To Complete

- Find the place where our search tool is declared
- Enable search grounding on the model
- Find the place where our model is declared
- Remove the external tool
- Find where we merge the result of `streamText` into the data stream
- Pass in an options object to `mergeIntoDataStream` with `sendSources` set to `true`
- Find where we're rendering the chat message component
- Add a new case to the chat message component to handle the `source` part
- Run the code locally and see how the results compare
