#!/usr/bin/env tsx

import { config } from "dotenv";
import { VoyageAIClient } from "voyageai";

config();

// Initialize Voyage AI client
const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

/**
 * Rerank search results using Voyage AI reranker
 * @param query - The search query
 * @param results - Array of search results to rerank
 * @returns Reranked results sorted by relevance score
 */
export async function rerankResults<T extends { content: string }>(
  query: string,
  results: T[],
): Promise<T[]> {
  if (!process.env.VOYAGE_API_KEY) {
    console.warn("⚠️  VOYAGE_API_KEY not set, skipping reranking");
    return results;
  }

  if (results.length === 0) {
    return results;
  }

  console.log(
    `🔄 Reranking ${results.length} results using Voyage AI reranker...`,
  );

  try {
    // Extract document texts for reranking
    const documents = results.map((result) => result.content);

    // Call Voyage AI reranker
    const reranking = await voyageClient.rerank({
      query,
      documents,
      model: "rerank-2.5",
      topK: results.length, // Return all results, sorted by relevance
      returnDocuments: false, // We don't need documents in response, we'll map by index
    });

    // Map reranked results back to original result objects
    const rerankedResults = (reranking.data || []).map((reranked) => {
      const originalResult = results[reranked.index ?? 0];
      return {
        ...originalResult,
        rerankScore: reranked.relevanceScore,
      } as T & { rerankScore: number | undefined };
    });

    console.log(rerankedResults);

    console.log(
      `✅ Reranking complete. Top result score: ${
        rerankedResults[0]?.rerankScore?.toFixed(4) || "N/A"
      }`,
    );

    // filter out results with rerankScore less than 0.5
    const filteredResults = rerankedResults.filter(
      (result) => result.rerankScore && result.rerankScore >= 0.5,
    );

    return filteredResults as T[];
  } catch (error) {
    console.error("❌ Error during reranking:", error);
    // Return original results if reranking fails
    return results;
  }
}
