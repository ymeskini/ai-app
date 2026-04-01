import { google } from "@ai-sdk/google";
import { wrapLanguageModel } from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";

export const model = wrapLanguageModel({
  model: google("gemini-2.0-flash-001"),
  middleware: devToolsMiddleware(),
});
export const factualityModel = google("gemini-2.0-flash-001");
export const summarizationModel = google("gemini-2.0-flash");
// Model used for content safety guardrails
export const guardrailModel = google("gemini-2.0-flash-001");
