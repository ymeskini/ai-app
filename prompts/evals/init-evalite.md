Our application is now more objectively useful. We've also hooked it up to an observability platform so that we can monitor it in production.

But one thing we don't have a good handle on is how well our experiments are performing locally.

We don't know yet whether a proposed change will make our application better or worse.

We have a good understanding of what our users are planning to do but we aren't yet leveraging that information into actionable insights.

We need to change that by evaluating our application as we develop it, using user data.

### Langfuse?

We could use Langfuse for this. Langfuse has a built-in evaluation set up that allows you to automatically evaluate your application based on user data.

However, I've found that writing your evals as code is much more flexible.

So instead we're going to use something called Evalite.

### Evalite

Evalite is a Vitest-based evals framework that runs in TypeScript. It feels very familiar if you've ever written a test in TypeScript before.

It's also one that I've written - so I'm a little biased. But crucially for this course, it's entirely local. So you won't run up a bill on a cloud platform by running your evals a lot.

## Steps to complete

- Install Evalite, Vitest, and a companion library called `autoevals`.

```bash
npm i -D evalite autoevals vitest
```

- Create a evals folder at the root of your project

Inside this folder, create a `initial.eval.ts` file with the following contents:

```ts
import { evalite } from "evalite";
import { Levenshtein } from "autoevals";

evalite("My Eval", {
  // A function that returns an array of test data
  // - TODO: Replace with your test data
  data: async () => {
    return [
      { input: "Hello", expected: "Hello World!" },
    ];
  },
  // The task to perform
  // - TODO: Replace with your LLM call
  task: async (input) => {
    return input + " World!";
  },
  // The scoring methods for the eval
  scorers: [Levenshtein],
});
```

- Add a script in your package.json to run Evalite watch.

```json
"scripts": {
  "evals": "evalite watch"
}
```

- Run the script with `pnpm run evals`.

Evalite will run at `localhost:3006`.

- Now it's time to set up Evalite with your environment variables. Create a `vitest.config.ts` file with the following contents:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
  },
});
```

- Install dotenv via pnpm:

```bash
npm i -D dotenv
```

Now any environment variables in `.env` will be passed to Evalite.
