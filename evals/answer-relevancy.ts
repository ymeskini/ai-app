import { createScorer } from "evalite";
import { generateObject } from "ai";
import type { Message } from "ai";
import { z } from "zod";

import { factualityModel } from "~/lib/model";

// Prompt for breaking down the model's answer into statements
function generateEvaluationStatementsPrompt({
  output,
}: {
  output: string;
}) {
    return `Given the text, break it down into meaningful statements while preserving context and relationships.
            Don't split too aggressively.

            Split compound statements particularly when they:
            - Are joined by "and"
            - Contain multiple distinct facts or claims
            - Have multiple descriptive elements about the subject


            Handle special cases:
            - A single word answer should be treated as a complete statement
            - Error messages should be treated as a single statement
            - Empty strings should return an empty list
            - When splitting text, keep related information together

            Example:
            Example text: Look! A bird! Birds are an interesting animal.

            {
                "statements": ["Look!", "A bird!", "Birds are interesting animals."]
            }

            Please return only JSON format with "statements" array.
            Return empty list for empty input.

            Text:
            ${output}

            JSON:
     `;
}

// System prompt for the relevancy evaluator
const ANSWER_RELEVANCY_AGENT_INSTRUCTIONS = `
  You are a balanced and nuanced answer relevancy evaluator. Your job is to determine if LLM outputs are relevant to the input, including handling partially relevant or uncertain cases.
      Key Principles:
      1. Evaluate whether the output addresses what the input is asking for
      2. Consider both direct answers and related context
      3. Prioritize relevance to the input over correctness
      4. Recognize that responses can be partially relevant
      5. Empty inputs or error messages should always be marked as "no"
      6. Responses that discuss the type of information being asked show partial relevance
`;

// Prompt for evaluating statement relevancy
function generateEvaluatePrompt({
  input,
  statements,
}: {
  input: string;
  statements: string[];
}) {
  return `Evaluate each statement's relevance to the input question, considering direct answers, related context, and uncertain cases.

    Return JSON with array of verdict objects. Each verdict must include:
    - "verdict": "yes", "no", or "unsure"
    - "reason": Clear explanation of the verdict

    Verdict Guidelines:
    - "yes": Statement explicitly and directly answers the input question when it:
        * Contains specific answer to the question asked (e.g., "The color of the sky is blue")
        * States explicit relationship between key concepts (e.g., "X is the CEO of company Y")
        * Can stand alone as a complete answer
        * Contains appropriate question-type response (e.g., location for "where", person for "who")
        * Note: If statement is incorrect but directly addresses the question, mark as "unsure"

    - "unsure": Statement shows partial relevance when it:
        * Discusses the type of information being asked about (e.g., mentions temperatures when asked about temperature)
        * Contains information about the answer without explicit statement
        * Uses importance indicators ("main", "primary", "major") with relevant concepts
        * Includes indirect references to the answer (e.g., "where the president works")
        * Contains topic-related administrative/governance terms without direct answer
        * References functions or characteristics typically associated with the answer
        * Uses terms that match what's being asked about
        * Mentions related entities without specifying their relationship to the answer
        * Is incorrect but shows understanding of the question
        * Contains the answer term but needs more context to be complete
        * Contains measurement units or quantities relevant to the question type
        * References locations or entities in the same category as what's being asked about
        * Provides relevant information without using explicit question-type terminology
        * Contains references to properties of the subject that relate to the question type


    - "no": Statement lacks meaningful connection to question when it:
        * Contains neither the subject nor the type of information being requested
        * Contains no terms related to what's being asked about
        * Contains only general subject information without relating to what's being asked
        * Consists of empty or meaningless content
        * Contains purely tangential information with no mention of the subject or question type
        * Discusses the subject but not the specific attribute being asked about
        * Note: Assessment is about connection to what's being asked, not factual accuracy
        * Contains no connection to what's being asked about (neither the subject nor the type of information requested)

    REMEMBER:
    - If the statement contains words or phrases that are relevant to the input, it is partially relevant.
    - If the statement is a direct answer to the input, it is relevant.
    - If the statement is completely unrelated to the input or contains nothing, it is not relevant.
    - DO NOT MAKE A JUDGEMENT ON THE CORRECTNESS OF THE STATEMENT, JUST THE RELEVANCY.

    STRICT RULES:
    - If a statement mentions the type of information being requested, it should be marked as "unsure" ONLY if it's discussing that type meaningfully (not just mentioning it)
    - Subject mentions alone are NOT enough for relevance - they must connect to what's being asked about
    - Empty or meaningless statements are always "no"
    - General facts about the subject without connection to the question type should be marked as "no"
    - ALWAYS mark a statement as "no" if it discusses the topic without any connection to the question type
    - Statements that mention neither the subject nor the type of information are always "no"
    - Type-level relevance overrides topic-only content
    - Measurement/quantity relevance counts as type-level relevance
    - Administrative/governance terms are only relevant if they relate to the question type
    - Descriptive facts about the subject should be marked as "no" unless they directly relate to the question type


    Examples of "no" statements:
        * "Japan has beautiful seasons" for "What is Japan's largest city?"
        * "Trees grow tall" for "How tall is Mount Everest?"
        * "The weather is nice" for "Who is the president?"

    Example:
    Input: "What color is the sky during daytime?"
    Statements: [
      "The sky is blue during daytime",
      "The sky is full of clouds",
      "I had breakfast today",
      "Blue is a beautiful color",
      "Many birds fly in the sky",
      "",
      "The sky is purple during daytime",
      "Daytime is when the sun is up",
    ]
    JSON:
    {
        "verdicts": [
            {
                "verdict": "yes",
                "reason": "This statement explicitly answers what color the sky is during daytime"
            },
            {
                "verdict": "unsure",
                "reason": "This statement describes the sky but doesn't address its color"
            },
            {
                "verdict": "no",
                "reason": "This statement about breakfast is completely unrelated to the sky"
            },
            {
                "verdict": "unsure",
                "reason": "This statement about blue is related to color but doesn't address the sky"
            },
            {
                "verdict": "unsure",
                "reason": "This statement is about the sky but doesn't address its color"
            },
            {
                "verdict": "no",
                "reason": "This statement is empty"
            },
            {
                "verdict": "unsure",
                "reason": "This statement is incorrect but contains relevant information and still addresses the question"
            },
            {
                "verdict": "no",
                "reason": "This statement is about daytime but doesn't address the sky"
            }
        ]
    }

  The number of verdicts MUST MATCH the number of statements exactly.

  Input:
  ${input}

  Number of statements: ${statements.length === 0 ? "1" : statements.length}

  Statements:
  ${statements.map((stmt, i) => `${i + 1}. ${stmt}`).join('\n  ')}

  JSON:
  `;
}

const checkAnswerRelevancy = async (opts: {
  question: string;
  submission: string;
}) => {
  // Step 1: Break down the submission into statements
  const { object: statementsResult } = await generateObject({
    model: factualityModel,
    prompt: generateEvaluationStatementsPrompt({
      output: opts.submission,
    }),
    schema: z.object({
      statements: z.array(z.string()).describe("List of statements extracted from the text."),
    }),
  });

  // Handle empty or no statements case
  if (statementsResult.statements.length === 0) {
    return {
      score: 0,
      metadata: {
        statements: [],
        verdicts: [],
        rationale: "No statements found in the submission",
      },
    };
  }

  // Step 2: Evaluate each statement's relevancy to the question
  const { object: evaluationResult } = await generateObject({
    model: factualityModel,
    system: ANSWER_RELEVANCY_AGENT_INSTRUCTIONS,
    prompt: generateEvaluatePrompt({
      input: opts.question,
      statements: statementsResult.statements,
    }),
    schema: z.object({
      verdicts: z.array(z.object({
        verdict: z.enum(["yes", "no", "unsure"]).describe("The relevancy verdict for this statement."),
        reason: z.string().describe("Clear explanation of the verdict."),
      })).describe("Array of verdict objects, one for each statement."),
    }),
  });

  // Step 3: Calculate the score by averaging the verdicts
  const scores = {
    yes: 1,
    no: 0,
    unsure: 0.5,
  };

  const totalScore = evaluationResult.verdicts.reduce(
    (sum, verdict) => sum + scores[verdict.verdict],
    0
  );

  const averageScore = evaluationResult.verdicts.length > 0
    ? totalScore / evaluationResult.verdicts.length
    : 0;

  return {
    score: averageScore,
    metadata: {
      statements: statementsResult.statements,
      verdicts: evaluationResult.verdicts,
      rationale: `Evaluated ${evaluationResult.verdicts.length} statements. ` +
        `Yes: ${evaluationResult.verdicts.filter(v => v.verdict === "yes").length}, ` +
        `No: ${evaluationResult.verdicts.filter(v => v.verdict === "no").length}, ` +
        `Unsure: ${evaluationResult.verdicts.filter(v => v.verdict === "unsure").length}`,
    },
  };
};

// This is the scorer that can be passed into the scorers in Evalite
export const AnswerRelevancy = createScorer<
  Message[],
  string,
  string
>({
  name: "AnswerRelevancy",
  description: "Evaluates how relevant the model's answer is to the input question by breaking it down into statements and scoring each statement's relevance.",
  scorer: async ({ input, output }) => {
    // Extract the question from the messages
    const question = input.find(msg => msg.role === "user")?.content ?? "";

    return checkAnswerRelevancy({
      question,
      submission: output,
    });
  },
});
