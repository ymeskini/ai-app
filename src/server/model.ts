import { google } from "@ai-sdk/google";
import { createVoyage } from "voyage-ai-provider";

export const model = google("gemini-2.0-flash-001");
export const factualityModel = google("gemini-2.0-flash-001");
export const summarizationModel = google("gemini-2.0-flash");
const voyage = createVoyage({ apiKey: process.env.VOYAGE_API_KEY });
export const embeddingModel = voyage.textEmbeddingModel("voyage-3-large");
