import { createScorer } from "evalite";
import { generateText, Output } from "ai";
import { z } from "zod";
import { factualityModel } from "../model.ts";
import { renderPrompt } from "../prompts/index.ts";

export const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { prompt } = renderPrompt("factuality", {
    question: opts.question,
    groundTruth: opts.groundTruth,
    submission: opts.submission,
  });

  const { output: object } = await generateText({
    model: factualityModel,
    prompt,
    output: Output.object({
      schema: z.object({
        answer: z.enum(["A", "B", "C", "D", "E"]).describe("Your selection."),
        rationale: z
          .string()
          .describe("Why you chose this answer. Be very detailed."),
      }),
    }),
  });

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

export const Factuality = createScorer<string, string, string>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    return checkFactuality({
      question: input,
      groundTruth: expected!,
      submission: output,
    });
  },
});
