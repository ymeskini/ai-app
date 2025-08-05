One thing I notice lots of chat applications doing is tracking the amount of tokens spent in each request.

This can either be displayed to the user or used as an internal guardrail to make sure you don't spend too much on each request.

Some open source deep search implementations I've seen set a token budget for each request instead of a number of maximum steps.

For this exercise, let's restrict ourselves to showing that usage in the frontend.

## The Setup

We're going to store the number of tokens used in our existing system context.

(Note, by the way, how nice it is to have a single store for all our state. It makes it so much easier to add new features.)

Each time we call an LLM, we're going to retrieve the usage from the response. Luckily, `streamText` and `generateText` both return a `usage` property.

```ts
const myExampleFunction = async () => {
  const { text, usage } = await generateText({
    model,
    prompt: `Hello, world!`,
  });

  console.log(usage.promptTokens);
  console.log(usage.completionTokens);
  console.log(usage.totalTokens);
};
```

We'll then store that in our system context along with a descriptor of where the usage came from.

Crucially, we should not change any existing synchronous functions to async ones - since this may delay the response to the user.

Feel free to use a pattern like this, where reporting the usage is done in a separate step:

```ts
import { streamText } from "ai";

const myExampleFunction = (ctx: SystemContext) => {
  const result = streamText({
    model,
    prompt: `Hello, world!`,
  });

  result.usage.then((usage) => {
    ctx.reportUsage("usage", usage);
  });
  return result;
};
```

## Sending The Usage To The Frontend

Once the stream completes, we should have a list of all the usage that has been reported in the system context.

We can then display that to the user.

The way that most makes sense to me is via a message annotation, which we've already used to report sources to the frontend.

We should make sure to apply the annotation _before_ the message is persisted to the database - that way the annotation will be stored for later retrieval.

Once on the frontend, we can show a small piece of text below the message: `Tokens: 80,200` or something like that.

We probably don't want to send the entire log that we capture in the context to the frontend. Exposing the internals of our application to the frontend might be a security risk. Just sending the total number of tokens used is enough.

## Steps To Complete

- Find our existing system context implementation
- Update the system context so that it can receive and track usage.
- Look for all of the places where we are calling `streamText`, `generateObject` or `generateText`.
- Add the usage from each call to the system context. For `streamText`, you may need to `await` the `usage` property.
- When the usage has been reported, but not yet persisted to the database, send an annotation to the frontend. Look at the existing message annotation code for inspiration.
- Display the message annotation in the frontend underneath the assistant message.
- Run the app to see if it works.
