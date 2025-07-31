import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
  // Multi-hop reasoning questions - these are the toughest cases for development
  {
    input: [
      {
        id: "6",
        role: "user",
        content:
          "Which Arsenal player from the 2024-25 season has the most international caps, and how does that compare to the player with the most caps in the 2023-24 season?",
      },
    ],
    expected:
      "This should identify Arsenal's most-capped international player in 2024-25, provide their exact cap count, compare it to the previous season's leader, and calculate the difference. Requires cross-referencing squad data across seasons.",
  },
  {
    input: [
      {
        id: "7",
        role: "user",
        content:
          "What is the total transfer spend of Arsenal in 2024 compared to their revenue from player sales, and how does this net spend compare to Manchester City's?",
      },
    ],
    expected:
      "Arsenal's 2024 transfer activity should include total expenditure, total sales revenue, net spend calculation, and comparison with Manchester City's net spend. Requires aggregating multiple transfer deals and financial data.",
  },
  {
    input: [
      {
        id: "8",
        role: "user",
        content:
          "How many goals has Arsenal scored in home matches versus away matches in the Premier League this season, and which venue has the better goal-per-match average?",
      },
    ],
    expected:
      "Arsenal's 2024-25 Premier League goal statistics should include home goals, away goals, number of home/away matches played, calculated averages for each venue, and identification of the better-performing venue.",
  },
  {
    input: [
      {
        id: "9",
        role: "user",
        content:
          "Which Arsenal academy graduate made their first-team debut most recently, and how does their playing time compare to other recent academy graduates in their first season?",
      },
    ],
    expected:
      "The most recent Arsenal academy graduate to debut should be identified with their debut date, total playing time (minutes/appearances), and comparison to other recent academy graduates' first-season statistics. Requires tracking youth development and debut timelines.",
  },
];
