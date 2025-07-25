In a previous exercise, we discussed the three different dataset sizes you need in order to run efficient evals:

| Type       | Size   | Frequency          | Purpose                                                          |
| ---------- | ------ | ------------------ | ---------------------------------------------------------------- |
| Dev        | 10-20  | During development | Local testing of toughest cases                                  |
| CI         | 50-200 | Before deployment  | Pre-deployment testing                                           |
| Regression | 500+   | Periodically       | Track performance changes over time, protect against regressions |

But currently, we're still only keeping our data in one single dataset, in our evals file.

Let's split out our dataset into separate files, one for each of the three types of dataset.

```tree
.
├── evals
│   ├── dev.ts
│   ├── ci.ts
│   └── regression.ts
```

Each file will contain an array of data we can pass to the `data` property of `evalite`:

```ts
export const devData = [
  {
    input: "What is the capital of France?",
    expected: "Paris",
  },
];
```

Then inside our eval file, we can resolve the data from the appropriate file based on an environment variable we pass:

```ts
import { devData } from "./evals/dev";
import { ciData } from "./evals/ci";
import { regressionData } from "./evals/regression";
import { env } from "~/env";

const data = devData;

// If CI, add the CI data
if (env.EVAL_DATASET === "ci") {
  data.push(...ciData);
  // If Regression, add the regression data AND the CI data
} else if (env.EVAL_DATASET === "regression") {
  data.push(...ciData, ...regressionData);
}

evalite("My Eval", {
  data,
  // ...
});
```

## Steps To Complete

- Find the existing `env.ts` file. Make it take in an optional `EVAL_DATASET` environment variable, which defaults to `dev`.
- Find the existing evals file
- Break the dataset into three separate files
- Update the evals file to resolve the data from the appropriate file based on the environment variable into the `evalite` call
- Run `npm run evalite` to check that it works
- Run `EVAL_DATASET=ci npm run evalite` to check that it works
