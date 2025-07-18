## The Problem

We need to integrate Langfuse into our application.

To do that, we're going to use their free tier, and their built-in Next.js and AI SDK integration.

## Steps To Complete

- Sign up for Langfuse, as shown in the video above.
- Add `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_BASEURL` to the `.env` file.
- Configure the `env.js` file to use the Langfuse environment variables
- Find all `generateText` or `streamText` calls in the codebase and add:

```ts
import { streamText } from "ai";

streamText({
  // ...other properties
  experimental_telemetry: { isEnabled: true },
});
```

- Install the correct packages:

```bash
npm install @vercel/otel langfuse-vercel @opentelemetry/api-logs @opentelemetry/instrumentation @opentelemetry/sdk-logs
```

- Create an `instrumentation.ts` file in `src/instrumentation.ts` with the following content:

```ts
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function register() {
  registerOTel({
    serviceName: "langfuse-vercel-ai-nextjs-example",
    traceExporter: new LangfuseExporter(),
  });
}
```

This `instrumentation.ts` file will be called both in development and production. This, combined with the environment variables which we've already configured, will export our data to langfuse.

- Run the app locally, make a few queries and check the LangFuse dashboard to see the data.
