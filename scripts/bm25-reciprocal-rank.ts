#!/usr/bin/env tsx

import { config } from "dotenv";
import { embed } from "ai";
import { createVoyage } from "voyage-ai-provider";
import { sql } from "drizzle-orm";
import { db } from "~/server/db";
import { chunks, documents } from "~/server/db/schemas";
import { rerankResults } from "./reranker";

config();

// Initialize Voyage AI provider
const voyageProvider = createVoyage();

/**
 * Reciprocal Rank Fusion (RRF) combines rankings from different search methods
 */
function reciprocalRankFusion(
  vectorResults: Omit<SearchResult, "similarity">[],
  bm25Results: Omit<SearchResult, "similarity">[],
  k: number = 60,
): SearchResult[] {
  const rrfScores = new Map<
    string,
    Omit<SearchResult, "similarity"> & { rrfScore: number }
  >();

  // Add vector results with RRF scoring
  vectorResults.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    rrfScores.set(result.chunkId, {
      ...result,
      rrfScore,
    });
  });

  // Add BM25 results with RRF scoring
  bm25Results.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = rrfScores.get(result.chunkId);

    if (existing) {
      // Combine RRF scores for documents that appear in both results
      existing.rrfScore += rrfScore;
      existing.bm25Score = result.bm25Score;
    } else {
      // Add new result from BM25
      rrfScores.set(result.chunkId, {
        ...result,
        rrfScore,
      });
    }
  });

  // Convert to array, sort by RRF score, and return as SearchResult[]
  return Array.from(rrfScores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((result) => ({
      ...result,
      similarity: result.rrfScore, // Use RRF score as the similarity score
    }));
}

/**
 * Preprocess query for BM25 search by converting to tsquery format
 */
function preprocessQueryForBM25(query: string): string {
  // Remove special characters that could break tsquery
  // Convert to lowercase and split into words
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // Join with OR operator for more lenient matching
  return words.join(" | ");
}

export interface SearchResult {
  chunkId: string;
  documentTitle: string;
  content: string;
  headingContext: string | null;
  similarity: number; // Combined score from hybrid search
  characterCount: number;
  wordCount: number;
  sourceFilePath: string;
  documentSlug: string | null;
  bm25Score?: number; // BM25 score from full-text search
  vectorScore?: number; // Vector similarity score
  rerankScore?: number; // Reranker relevance score
}

/**
 * Generate embedding for a question using Voyage AI
 */
async function generateQuestionEmbedding(question: string): Promise<number[]> {
  console.log(`🔮 Generating embedding for question...`);

  try {
    const { embedding } = await embed({
      model: voyageProvider.textEmbeddingModel("voyage-code-3"),
      value: question,
    });

    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    return embedding;
  } catch (error) {
    console.error("❌ Error generating embedding:", error);
    throw error;
  }
}

/**
 * Search for chunks using BM25 full-text search
 */
async function searchWithBM25(
  query: string,
  limit: number = 20,
): Promise<Omit<SearchResult, "similarity">[]> {
  console.log(`🔍 Searching for ${limit} chunks using BM25...`);

  try {
    const processedQuery = preprocessQueryForBM25(query);
    console.log(`📝 Processed query for BM25: "${processedQuery}"`);

    const results = await db
      .select({
        chunkId: chunks.id,
        documentTitle: documents.title,
        content: chunks.content,
        headingContext: chunks.headingContextText,
        characterCount: chunks.characterCount,
        wordCount: chunks.wordCount,
        sourceFilePath: documents.sourceFilePath,
        documentSlug: documents.slug,
        bm25Score: sql<number>`ts_rank(${chunks.searchVector}, to_tsquery('english', ${processedQuery}))`,
      })
      .from(chunks)
      .innerJoin(documents, sql`${chunks.documentId} = ${documents.id}`)
      .where(
        sql`${chunks.searchVector} @@ to_tsquery('english', ${processedQuery})`,
      )
      .orderBy(
        sql`ts_rank(${chunks.searchVector}, to_tsquery('english', ${processedQuery})) DESC`,
      )
      .limit(limit);
    return results;
  } catch (error) {
    console.error("❌ Error searching with BM25:", error);
    throw error;
  }
}

/**
 * Search for semantically similar chunks using vector similarity
 */
async function searchSimilarChunks(
  questionEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.5,
): Promise<Omit<SearchResult, "similarity">[]> {
  console.log(
    `🔍 Searching for ${limit} most similar chunks using vector cosine similarity...`,
  );

  try {
    // Use cosine similarity for vector search
    // 1 - cosine_distance gives us cosine similarity (higher = more similar)
    const results = await db
      .select({
        chunkId: chunks.id,
        documentTitle: documents.title,
        content: chunks.content,
        headingContext: chunks.headingContextText,
        characterCount: chunks.characterCount,
        wordCount: chunks.wordCount,
        sourceFilePath: documents.sourceFilePath,
        documentSlug: documents.slug,
        vectorScore: sql<number>`1 - (${chunks.embedding} <=> ${JSON.stringify(
          questionEmbedding,
        )})`,
      })
      .from(chunks)
      .innerJoin(documents, sql`${chunks.documentId} = ${documents.id}`)
      .where(sql`${chunks.embedding} IS NOT NULL`)
      .orderBy(
        sql`${chunks.embedding} <=> ${JSON.stringify(questionEmbedding)}`,
      )
      .limit(limit);

    // Filter by vector score threshold
    const filteredResults = results.filter(
      (result) => (result.vectorScore || 0) >= similarityThreshold,
    );

    return filteredResults;
  } catch (error) {
    console.error("❌ Error searching similar chunks:", error);
    throw error;
  }
}

/**
 * Hybrid search combining vector similarity and BM25 full-text search using RRF
 */
async function hybridSearch(
  question: string,
  questionEmbedding: number[],
  limit: number = 5,
  options: {
    similarityThreshold?: number;
    rrfK?: number; // RRF parameter (default 60)
  } = {},
): Promise<SearchResult[]> {
  const { similarityThreshold = 0.5, rrfK = 60 } = options;
  console.log(
    `🔀 Starting hybrid search using Reciprocal Rank Fusion (RRF) with k=${rrfK}`,
  );

  try {
    // Get results from both search methods
    const [vectorResults, bm25Results] = await Promise.all([
      searchSimilarChunks(questionEmbedding, 20, 0.1), // Lower threshold to get more candidates
      searchWithBM25(question, 20),
    ]);

    console.log(`📊 Vector search found ${vectorResults.length} results`);
    console.log(`📊 BM25 search found ${bm25Results.length} results`);

    // Use RRF to combine rankings
    const combinedResults = reciprocalRankFusion(
      vectorResults,
      bm25Results,
      rrfK,
    );

    // Filter by threshold and limit results
    const filteredResults = combinedResults
      .filter((result) => result.similarity >= similarityThreshold)
      .slice(0, limit);

    console.log(
      `✅ Hybrid search returned ${filteredResults.length} results above threshold ${similarityThreshold}`,
    );
    return filteredResults;
  } catch (error) {
    console.error("❌ Error in hybrid search:", error);
    throw error;
  }
}

/**
 * Format and display search results
 */
function displayResults(results: SearchResult[], question: string): void {
  console.log("\n" + "=".repeat(80));
  console.log(`📊 SEMANTIC SEARCH RESULTS FOR: "${question}"`);
  console.log("=".repeat(80));

  if (results.length === 0) {
    console.log("🔍 No relevant chunks found above the similarity threshold.");
    console.log("💡 Try:");
    console.log("   - Rephrasing your question");
    console.log("   - Using different keywords");
    console.log("   - Lowering the similarity threshold");
    return;
  }

  results.forEach((result, index) => {
    console.log(`\n📄 RESULT ${index + 1}:`);
    console.log(`   📋 Document: ${result.documentTitle}`);
    console.log(`   📁 Source: ${result.sourceFilePath}`);
    console.log(`   🔗 Slug: ${result.documentSlug || "N/A"}`);
    console.log(`   🎯 RRF Score: ${result.similarity.toFixed(6)}`);
    if (result.rerankScore !== undefined) {
      console.log(
        `   ⭐ Rerank Score: ${(result.rerankScore * 100).toFixed(2)}%`,
      );
    }
    if (result.vectorScore !== undefined) {
      console.log(
        `   🔢 Vector Score: ${(result.vectorScore * 100).toFixed(2)}%`,
      );
    }
    if (result.bm25Score !== undefined) {
      console.log(`   🔤 BM25 Score: ${(result.bm25Score * 100).toFixed(2)}%`);
    }
    console.log(
      `   📏 Length: ${result.characterCount} chars, ${result.wordCount} words`,
    );

    if (result.headingContext) {
      console.log(`   🏷️  Context: ${result.headingContext}`);
    }

    console.log(`   💬 Content Preview:`);
    console.log(
      `   "${result.content.substring(0, 200).replace(/\n/g, " ")}${
        result.content.length > 200 ? "..." : ""
      }"`,
    );
    console.log(`   🆔 Chunk ID: ${result.chunkId}`);

    if (index < results.length - 1) {
      console.log("\n" + "-".repeat(40));
    }
  });

  console.log("\n" + "=".repeat(80));
}

/**
 * Main function to handle semantic search
 */
async function performSemanticSearch(
  question: string,
  limit: number = 5,
): Promise<SearchResult[]> {
  const similarityThreshold = 0.01; // Lower threshold for RRF scores
  console.log("🚀 Starting semantic search...\n");

  // Validate environment variable
  if (!process.env.VOYAGE_API_KEY) {
    console.error(
      "❌ VOYAGE_API_KEY environment variable is required but not set",
    );
    process.exit(1);
  }

  try {
    // Generate embedding for the question
    const questionEmbedding = await generateQuestionEmbedding(question);

    // Search for similar chunks using hybrid search with RRF
    const hybridResults = await hybridSearch(
      question,
      questionEmbedding,
      limit,
      {
        similarityThreshold,
        rrfK: 60, // Standard RRF parameter
      },
    );

    // Rerank results using Voyage AI reranker
    const results = await rerankResults(question, hybridResults);

    // Limit to requested number of results after reranking
    const finalResults = results.slice(0, limit);

    // Display results
    displayResults(finalResults, question);

    return finalResults;
  } catch (error) {
    console.error("❌ Semantic search failed:", error);
    throw error;
  }
}

/**
 * Handle command line arguments and interactive input
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let question: string;
  let limit: number = 5;

  // Parse command line arguments
  if (args.length === 0) {
    // Interactive mode - prompt for question
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    question = await new Promise<string>((resolve) => {
      rl.question("🤔 Enter your question: ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  } else {
    // Parse arguments: question --limit=N --threshold=N
    question = args.filter((arg) => !arg.startsWith("--")).join(" ");

    // Parse optional parameters
    const limitArg = args.find((arg) => arg.startsWith("--limit="));

    if (limitArg) {
      limit = parseInt(limitArg.split("=")[1] ?? "") || 5;
    }
  }

  if (!question) {
    console.error("❌ No question provided");
    console.log("Usage:");
    console.log('  tsx scripts/semantic-search.ts "your question here"');
    console.log(
      '  tsx scripts/semantic-search.ts "your question" --limit=10 --threshold=0.6',
    );
    console.log("  tsx scripts/semantic-search.ts  (for interactive mode)");
    process.exit(1);
  }

  console.log(`Question: "${question}"`);
  console.log(`Limit: ${limit} results`);

  // Perform the search
  await performSemanticSearch(question, limit);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

// Export for potential use as a module
export {
  performSemanticSearch,
  generateQuestionEmbedding,
  searchSimilarChunks,
  hybridSearch,
  searchWithBM25,
};
