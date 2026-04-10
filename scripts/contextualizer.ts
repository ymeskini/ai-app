#!/usr/bin/env tsx

import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { config } from "dotenv";

config();

/**
 * Generate contextual prefix for a chunk using OpenAI
 * This follows the Anthropic Contextual Retrieval approach
 * @param wholeDocument - The full document content
 * @param chunkContent - The specific chunk content
 * @returns A short contextual prefix (50-100 tokens) that situates the chunk within the document
 */
export async function generateContextForChunk(
  wholeDocument: string,
  chunkContent: string,
): Promise<string> {
  const prompt = `<document>
    ${wholeDocument}
    </document>
    Here is the chunk we want to situate within the whole document
    <chunk>
    ${chunkContent}
    </chunk>
    Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;

  try {
    const { text } = await generateText({
      model: google("gemini-flash-latest"),
      prompt,
    });

    return text.trim();
  } catch (error) {
    console.error("❌ Error generating context for chunk:", error);
    throw error;
  }
}
