One thing you may have noticed from the new application is that it's very hard to observe just by watching it.

We don't yet have decent information coming through to Langfuse either.

That's because we aren't passing anything to do with telemetry to our new LLM calls.

So, let's fix that.

We're currently passing in the telemetry as a single block into our loop. If we then use that telemetry information in all of the LLM calls, we'll have lots of 'spans' with the same name.

Instead, we should pass in a `langfuseTraceId` to the loop, and then use different names for each of the LLM calls. That way, we'll be able to see the entire loop in Langfuse.

We also need to think about our evals where we don't want to capture traces - so making the `langfuseTraceId` optional might be a good idea.

## Steps To Complete

- Find the place where the agent loop is implemented
- Add a `langfuseTraceId` to its input parameters
- Inside the agent loop look for any LLM calls, denoted by `streamText` or `generateObject` functions from `ai`.
- Pass a `telemetry` object to the LLM call, with the `langfuseTraceId`, and a unique `functionId` for this LLM call.

```ts
import { streamText } from "ai";

streamText({
  // ...other properties
  experimental_telemetry: {
    isEnabled: true,
    functionId:
      "some-unique-function-id-for-this-llm-call",
    metadata: {
      langfuseTraceId: langfuseTraceId,
    },
  },
});
```

- Run the app and check if the telemetry is working in Langfuse.
