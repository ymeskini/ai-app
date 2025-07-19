Our observability tool is doing a good job of monitoring our LLM. But it could also be helping us in terms of monitoring other parts of our system.

I'm especially thinking about our database calls. The way our database behaves is a key part of our system and influences how the LLM behaves.

If something goes wrong with our database, we're going to want to know about it and introspect what went wrong.

In order to do this, we're going to take advantage of LangFuse's built-in support for OpenTelemetry.

## `langfuse.trace()`

Let's examine the Langfuse client a little bit more. It has a method on it called `trace()`.

```ts
import { Langfuse } from "langfuse";

const langfuse = new Langfuse();

const trace = langfuse.trace({
  name: "chat",
  userId: session.user.id,
});
```

As we've seen, traces are used as the top-level container for our tracking data. They display in a top-level table inside Langfuse.

These traces can then contain spans.

```ts
const span = trace.span({
  name: "db-call",
  input: {
    some: "input",
  },
});

// ... some db call ...

span.end({
  output: {
    the: "output from the db call",
  },
});
```

Spans display as actions taken within the trace. They record the time taken to complete the action, its name, and the input and output of the action.

We can use this to our advantage by recording each of the database calls as individual spans within the trace. This will mean we can see the flow of data through our system as we build our apps.

## `trace.update()`

Our trace is currently being created after one of our database calls. We take the `id` of the chat being created and use that as a `sessionId` for the trace:

```ts
const chatId =
  await someDatabaseCallWhichCreatesOrFindsTheChat();

const trace = langfuse.trace({
  sessionId: chatId,
  name: "chat",
  userId: session.user.id,
});
```

This is a bit of a problem because we do want to retain the `sessionId` so that we can group traces together.

However, we can solve this with `trace.update`.

```ts
trace.update({
  sessionId: chatId,
});
```

This method allows you to update attributes of the trace after it has been created. For us, this means we can update the `sessionId` once we've resolved the `chatId`.

## Steps To Complete

- Identify all of the database calls made inside the `/api/chat` `POST` route.
- For each database call, create a span which tracks the input with `trace.span` and the output with `trace.end`. Choose descriptive names using dash case for each span name. REMEMBER to reuse the existing `trace` object - don't create new ones for each span.
- Run the app and observe the trace in Langfuse.
