We now have the core elements of our loop coded up. We now need to implement the loop and the logic for executing the actions.

As a reminder the pseudocode for our loop looked like this:

```ts
// A persistent container for the state of our system
const ctx = new SystemContext();

// A loop that continues until we have an answer
// or we've taken 10 actions
while (ctx.step < 10) {
  // We choose the next action based on the state of our system
  const nextAction = await getNextAction(ctx);

  // We execute the action and update the state of our system
  if (nextAction === "search") {
    const result = await search(ctx);
    ctx.searchResults = result;
  } else if (nextAction === "scrape-url") {
    const result = await scrapeUrl(ctx);
    ctx.scrapedUrl = result;
  } else if (nextAction === "answer") {
    return answerQuestion(ctx);
  }

  // We increment the step counter
  ctx.step++;
}

// If we've taken 10 actions and still don't have an answer,
// we ask the LLM to give its best attempt at an answer
return answerQuestion(ctx, { isFinal: true });
```

## Steps To Complete

- Read the existing `getNextAction` function.

- Read the existing `SystemContext` class.

- Read the existing tool calls for `scrapeUrl` and `searchWeb`.

- Create a new file called `run-agent-loop.ts`. Take the tool calls and reuse them as the `scrapeUrl` and `searchWeb` functions. Do not change the original implementation - do some copy/pasting.

- Implement the `answerQuestion` function, which will be a call to a LLM with a system prompt designed to answer the user's question. Put it in a separate file.

If the `isFinal` flag is true, tell the LLM that we may not have all the information we need to answer the question, but we need to make our best effort.
