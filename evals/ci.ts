import type { Message } from "ai";

export const ciData: { input: Message[]; expected: string }[] = [
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
];
