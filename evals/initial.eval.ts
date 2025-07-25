import { evalite } from "evalite";
import { createScorer } from "evalite";
import { generateObject } from "ai";
import type { Message } from "ai";
import { z } from "zod";

import { askDeepSearch } from "~/lib/deep-search";
import { factualityModel } from "~/lib/model";

const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { object } = await generateObject({
    model: factualityModel,
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
const Factuality = createScorer<
  Message[],
  string,
  string
>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    // Extract the question from the messages
    const question = input.find(msg => msg.role === "user")?.content ?? "";

    return checkFactuality({
      question,
      groundTruth: expected!,
      submission: output,
    });
  },
});

evalite("Arsenal Transfer Activity Eval", {
  data: async (): Promise<
    { input: Message[]; expected: string }[]
  > => {
    return [
      // Basic questions requiring recent knowledge
      {
        input: [
          {
            id: "1",
            role: "user",
            content: "Who did Arsenal sign in January 2025?",
          },
        ],
        expected: "Arsenal's January 2025 transfer window signings should include specific player names, transfer fees, and contract details from reliable sources like official club announcements or reputable football journalism.",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content: "What is Arsenal's current league position in the 2024-25 Premier League season?",
          },
        ],
        expected: "Arsenal's current position in the Premier League table should include their exact position, points total, goal difference, and recent form from the official Premier League standings.",
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content: "Who is Arsenal's top scorer in the 2024-25 season so far?",
          },
        ],
        expected: "Arsenal's leading goalscorer for the 2024-25 season should include the player's name, total goals scored across all competitions, and breakdown by competition (Premier League, Champions League, cup competitions).",
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content: "What was Arsenal's most expensive signing in the summer 2024 transfer window?",
          },
        ],
        expected: "Arsenal's most expensive summer 2024 signing should include the player's name, transfer fee, selling club, and key contract details from verified transfer reports.",
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content: "How many Champions League matches has Arsenal played in the 2024-25 season?",
          },
        ],
        expected: "Arsenal's Champions League participation in 2024-25 should include total matches played, results, group stage or knockout phase details, and current tournament status.",
      },
      // Multi-hop reasoning questions
      {
        input: [
          {
            id: "6",
            role: "user",
            content: "Which Arsenal player from the 2024-25 season has the most international caps, and how does that compare to the player with the most caps in the 2023-24 season?",
          },
        ],
        expected: "This should identify Arsenal's most-capped international player in 2024-25, provide their exact cap count, compare it to the previous season's leader, and calculate the difference. Requires cross-referencing squad data across seasons.",
      },
      {
        input: [
          {
            id: "7",
            role: "user",
            content: "What is the total transfer spend of Arsenal in 2024 compared to their revenue from player sales, and how does this net spend compare to Manchester City's?",
          },
        ],
        expected: "Arsenal's 2024 transfer activity should include total expenditure, total sales revenue, net spend calculation, and comparison with Manchester City's net spend. Requires aggregating multiple transfer deals and financial data.",
      },
      {
        input: [
          {
            id: "8",
            role: "user",
            content: "How many goals has Arsenal scored in home matches versus away matches in the Premier League this season, and which venue has the better goal-per-match average?",
          },
        ],
        expected: "Arsenal's 2024-25 Premier League goal statistics should include home goals, away goals, number of home/away matches played, calculated averages for each venue, and identification of the better-performing venue.",
      },
      {
        input: [
          {
            id: "9",
            role: "user",
            content: "Which Arsenal academy graduate made their first-team debut most recently, and how does their playing time compare to other recent academy graduates in their first season?",
          },
        ],
        expected: "The most recent Arsenal academy graduate to debut should be identified with their debut date, total playing time (minutes/appearances), and comparison to other recent academy graduates' first-season statistics. Requires tracking youth development and debut timelines.",
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Regex to match markdown links: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});
