It's all very well having the ability to view our evals side by side.

But we've not actually written any scorers to give us a sense for how well our system is doing.

Let's write a scorer that checks against one of our success criteria. Let's pick some low-hanging fruit first:

We want to make sure that every answer has some markdown links embedded in it.

For that, we can add a custom scorer to our eval.

This will be relatively simple to implement. We just need to check inside the answer for any syntax that looks like a markdown link.

This is what's called a deterministic eval. It's very similar to a unit test. It can be run very quickly and doesn't require calling an LLM or asking a human labeller.

## Steps To Complete

- Find the existing eval (in the `evals` folder)

- Create a new scorer inside the `scorers` array of `evalite`:

```ts
evalite("Deep Search Eval", {
  data, // existing data
  task, // existing task
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const containsLinks = undefined; // exercise for the reader

        return containsLinks ? 1 : 0;
      },
    },
  ],
});
```

- Run the eval and see the results.
