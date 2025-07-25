We have picked out the easiest possible thing we could evaluate for our first eval.

But to know whether we are actually meeting our success criteria, we need to go a bit deeper.

Our main criteria for success is factuality - whether the answer is verifiably accurate.

For that we could use a human fact checker. We could pay someone (or do it ourselves) to check the LLMs answers and see if they're correct or not.

But this would be astonishingly expensive and time consuming.

But there is something else we can try. We can try using an LLM to judge an answer's factuality.

We have to be careful here - we need to provide the "LLM judge" with all the information it needs to perform its job correctly. It needs:

- The question asked
- The answer given
- The actual truth

We can do this by giving the LLM a prompt that includes all of this information. We can also do this within Evalite. Evalite's documentation has this exact example, using the AI SDK.

It looks like this:

```ts
import { createScorer } from "evalite";
import { generateObject } from "ai";
import { z } from "zod";

export const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { object } = await generateObject({
    model, // whichever model you want to use
    /**
     * Prompt taken from autoevals:
     *
     * {@link https://github.com/braintrustdata/autoevals/blob/5aa20a0a9eb8fc9e07e9e5722ebf71c68d082f32/templates/factuality.yaml}
     */
    prompt: `
      You are comparing a submitted answer to an expert answer on a given question. Here is the data:
      [BEGIN DATA]
      ************
      [Question]: ${opts.question}
      ************
      [Expert]: ${opts.groundTruth}
      ************
      [Submission]: ${opts.submission}
      ************
      [END DATA]

      Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
      The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
      (A) The submitted answer is a subset of the expert answer and is fully consistent with it.
      (B) The submitted answer is a superset of the expert answer and is fully consistent with it.
      (C) The submitted answer contains all the same details as the expert answer.
      (D) There is a disagreement between the submitted answer and the expert answer.
      (E) The answers differ, but these differences don't matter from the perspective of factuality.
    `,
    schema: z.object({
      answer: z
        .enum(["A", "B", "C", "D", "E"])
        .describe("Your selection."),
      rationale: z
        .string()
        .describe(
          "Why you chose this answer. Be very detailed.",
        ),
    }),
  });

  /**
   * LLM's are well documented at being poor at generating
   */
  const scores = {
    A: 0.4,
    B: 0.6,
    C: 1,
    D: 0,
    E: 1,
  };

  return {
    score: scores[object.answer],
    metadata: {
      rationale: object.rationale,
    },
  };
};

// This is the scorer that can be passed into the scorers in Evalite
export const Factuality = createScorer<
  string,
  string,
  string
>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    return checkFactuality({
      question: input,
      groundTruth: expected!,
      submission: output,
    });
  },
});
```

You'll notice that in the example above the scorer doesn't just return the score, it also returns a `metadata` object.

This is useful because it allows us to get the LLM's reasoning for its answer.

### Diving Into The Prompt

The prompt is the most important part of this implementation. I've cribbed the prompt from the [autoevals](https://github.com/braintrustdata/autoevals) library. It does a couple of important things:

- It gives the LLM an exact criteria for each 'score'
- It then translates the score into a number

It also helpfully scores subsets and supersets of the expert answer - this gives more flexibility than if we just used 0 or 100%.

### Adding `expected` To Our Evals

We now need to do some grunt work - we need to add the `expected` field to each of our evals.

As you can see, this makes our eval twice as hard to author - we now also need to write the expected answer for each example.

```ts
import { Message } from "ai";
import { evalite } from "evalite";

evalite("Deep Search Eval", {
  data: async (): Promise<
    { input: Message[]; expected: string }[]
  > => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of TypeScript?",
          },
        ],
        expected:
          "The current TypeScript version is 5.8",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of Next.js 15?",
          },
        ],
        expected: `
            @next/codemod CLI: Easily upgrade to the latest Next.js and React versions.
            Async Request APIs (Breaking): Incremental step towards a simplified rendering and caching model.
            Caching Semantics (Breaking): fetch requests, GET Route Handlers, and client navigations are no longer cached by default.
            React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.
            Turbopack Dev (Stable): Performance and stability improvements.
            Static Indicator: New visual indicator shows static routes during development.
            unstable_after API (Experimental): Execute code after a response finishes streaming.
            instrumentation.js API (Stable): New API for server lifecycle observability.
            Enhanced Forms (next/form): Enhance HTML forms with client-side navigation.
            next.config: TypeScript support for next.config.ts.
            Self-hosting Improvements: More control over Cache-Control headers.
            Server Actions Security: Unguessable endpoints and removal of unused actions.
            Bundling External Packages (Stable): New config options for App and Pages Router.
            ESLint 9 Support: Added support for ESLint 9.
            Development and Build Performance: Improved build times and Faster Fast Refresh.
        `,
      },
    ];
  },
});
```

This is easier for some questions than others. Our existing Vue vs React question is very difficult - I'm personally not an expert on the differences.

So feel free to chop the examples down to only the two above.

### Choosing A Model For The LLM-As-A-Judge

One question remains - what kind of model should we use? There are two schools of thought here.

School one is "go big or go home". Since you're trusting the LLM with an important task, you should use a powerful model, maybe even with reasoning capabilities.

School two is "use a just-good-enough model". The LLM as a judge is doing a relatively simple task - classification. So, you should use a small to mid-range model that runs quickly and cheaply.

You should experiment with both and see which works better.

For those following along and using Google, we'll use `gemini-1.5-flash` for this task.

```ts
import { google } from "@ai-sdk/google";

export const factualityModel = google(
  "gemini-1.5-flash",
);
```

## Steps To Complete

- Look in the `evals` folder for the existing eval.
- Inside the `scorers` for this eval, use the `Factuality` scorer above.
- As above, add the `expected` field to the examples.
- Add the `factualityModel` to the existing models file.
- Run the eval and see the results.
