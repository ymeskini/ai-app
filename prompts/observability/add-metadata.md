## The Problem

We're getting some fairly decent information from Langfuse. But we aren't using the platform to its full potential.

The features we're not using are:

- Sessions, where traces can be grouped together
- Users, where we can track the requests made by a user
- Environment, where we can see which environment the request was made in

This will give us a bit more insight as to what's happening in our app in Langfuse, and help us when we want to filter data we're receiving in production.

## Steps To Complete

- Adjust the `instrumentation.ts` file to contain the following contents:

```ts
import { env } from "~/env";
import { LangfuseExporter } from "langfuse-vercel";
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "langfuse-vercel-ai-nextjs-example",
    traceExporter: new LangfuseExporter({
      environment: env.NODE_ENV,
    }),
  });
}
```

This will provide the environment to the entire app.

- Install the package `langfuse`:

```bash
npm install langfuse
```

- Inside the `/api/chat` route, initialize the Langfuse client:

```ts
import { Langfuse } from "langfuse";
import { env } from "~/env";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});
```

- When the `/api/chat` route is called, create a trace and add the user and session to it. Give the trace a name of `chat`. The user ID will come from the existing authentication session. We're going to reuse the chat ID to be the Langfuse session ID.

```ts
const session = await auth(); // existing code

const trace = langfuse.trace({
  sessionId: currentChatId,
  name: "chat",
  userId: session.user.id,
});
```

Remember the way that the chat ID was created - if the user didn't pass a chat ID we create a chat first. Make sure you don't blindly use the one being passed in from the request body.

- Inside the `streamText` function, change the `experimental_telemetry` to contain the trace:

```ts
streamText({
  experimental_telemetry: {
    isEnabled: true,
    functionId: `agent`,
    metadata: {
      langfuseTraceId: trace.id,
    },
  },
});
```

Call the `functionId` whatever you like. It's just a name to identify the function in the Langfuse dashboard.

- In the `onFinish` function, call `flushAsync` on the langfuse client to flush the trace to the Langfuse platform.

```ts
await langfuse.flushAsync();
```

- Run the app locally, make a few queries and check the Langfuse dashboard to see the data.
