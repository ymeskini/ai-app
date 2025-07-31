import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
  // Additional comprehensive test cases for regression testing
  {
    input: [
      {
        id: "10",
        role: "user",
        content:
          "What was Arsenal's win rate in the Premier League during the 2023-24 season?",
      },
    ],
    expected:
      "Arsenal's 2023-24 Premier League win rate should include total matches played, wins, losses, draws, and calculated win percentage with accurate historical data.",
  },
  {
    input: [
      {
        id: "11",
        role: "user",
        content:
          "Who were Arsenal's opponents in the Champions League round of 16 in 2024?",
      },
    ],
    expected:
      "Arsenal's Champions League round of 16 opponent in 2024 should include the team name, aggregate score, individual match results, and progression outcome.",
  },
  {
    input: [
      {
        id: "12",
        role: "user",
        content:
          "What is the total market value of Arsenal's current squad according to Transfermarkt?",
      },
    ],
    expected:
      "Arsenal's squad market value should include the total valuation, most valuable players, and comparison to previous seasons or other top clubs.",
  },
  {
    input: [
      {
        id: "13",
        role: "user",
        content:
          "How many clean sheets has Arsenal kept in all competitions this season?",
      },
    ],
    expected:
      "Arsenal's clean sheet statistics should include total clean sheets across all competitions, breakdown by competition, and comparison to previous seasons.",
  },
  {
    input: [
      {
        id: "14",
        role: "user",
        content:
          "What was the attendance at Arsenal's last home Premier League match?",
      },
    ],
    expected:
      "The attendance figure for Arsenal's most recent home Premier League match should include the exact number, stadium capacity utilization, and context about the match.",
  },
  {
    input: [
      {
        id: "15",
        role: "user",
        content: "Who is Arsenal's current captain and vice-captain?",
      },
    ],
    expected:
      "Arsenal's current leadership structure should include the captain and vice-captain(s), when they were appointed, and any recent changes to the captaincy.",
  },
  {
    input: [
      {
        id: "16",
        role: "user",
        content: "What are Arsenal's upcoming fixtures in the next two weeks?",
      },
    ],
    expected:
      "Arsenal's upcoming fixtures should include dates, opponents, competitions, venue (home/away), and kick-off times for matches in the next two weeks.",
  },
  {
    input: [
      {
        id: "17",
        role: "user",
        content:
          "How many yellow and red cards has Arsenal received in the Premier League this season?",
      },
    ],
    expected:
      "Arsenal's disciplinary record should include total yellow cards, red cards, breakdown by player, and comparison to league average or previous seasons.",
  },
];
