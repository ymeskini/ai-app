#!/usr/bin/env tsx

import "dotenv/config";

import { generateText } from "ai";

import { model } from "../src/server/model.ts";
import { renderPrompt } from "../src/server/prompts/index.ts";
import { generateMDNUrl } from "../src/app/helpers/general.ts";
import { performSemanticSearch, type SearchResult } from "./semantic-search.ts";

interface RAGResponse {
  answer: string;
  sources: Array<{
    documentTitle: string;
    sourceFilePath: string;
    content: string;
    similarity: number;
  }>;
  tokensUsed?: number;
}

export function transformChunksForFrontend(chunks: SearchResult[]) {
  return chunks.map((source, index) => ({
    id: String(index + 1),
    citationNumber: index + 1,
    title: source.documentTitle,
    url: generateMDNUrl(source.documentSlug, source.headingContext),
    similarity: source.similarity,
    sourceFilePath: source.sourceFilePath,
    chunkId: source.chunkId,
    content: source.content,
  }));
}

function formatDocumentsXml(chunks: SearchResult[]): string {
  return transformChunksForFrontend(chunks)
    .map(
      (doc) => `<document id="${doc.id}" citation="${doc.citationNumber}">
    <title>${doc.title}</title>
    <url>${doc.url}</url>
    <similarity>${(doc.similarity * 100).toFixed(1)}%</similarity>
    <content>${doc.content}</content>
  </document>`,
    )
    .join("\n");
}

export async function queryLLM(
  question: string,
  chunks: SearchResult[],
): Promise<{ answer: string; tokensUsed?: number }> {
  console.log("🤖 Querying Gemini...");

  const { prompt } = renderPrompt("rag-query", {
    documents: formatDocumentsXml(chunks),
    question,
  });

  const { text, usage } = await generateText({ model, prompt });

  console.log(
    `✅ Generated response (${usage?.totalTokens ?? "unknown"} tokens)`,
  );

  return { answer: text, tokensUsed: usage?.totalTokens };
}

function displayRAGResponse(response: RAGResponse, question: string): void {
  console.log("\n" + "=".repeat(80));
  console.log(`🎯 RAG RESPONSE FOR: "${question}"`);
  console.log("=".repeat(80));

  console.log("\n🤖 AI ANSWER:");
  console.log("-".repeat(40));
  console.log(response.answer);

  if (response.tokensUsed) {
    console.log(`\n📊 Tokens used: ${response.tokensUsed}`);
  }

  console.log("\n📚 SOURCES USED:");
  console.log("-".repeat(40));
  response.sources.forEach((source, index) => {
    console.log(`${index + 1}. ${source.documentTitle}`);
    console.log(`   📁 ${source.sourceFilePath}`);
    console.log(`   🎯 Similarity: ${(source.similarity * 100).toFixed(1)}%`);
    console.log(
      `   📄 "${source.content.substring(0, 100).replace(/\n/g, " ")}..."`,
    );
    console.log();
  });

  console.log("=".repeat(80));
}

export async function performRAGQuery(
  question: string,
  options: { limit?: number } = {},
): Promise<RAGResponse> {
  const { limit = 5 } = options;

  console.log("🚀 Starting RAG query...\n");
  console.log(`📝 Question: "${question}"`);
  console.log("🤖 Using model: gemini-2.0-flash-001\n");

  if (!process.env.VOYAGE_API_KEY) {
    console.error(
      "❌ VOYAGE_API_KEY environment variable is required but not set",
    );
    process.exit(1);
  }

  const retrievedChunks = await performSemanticSearch(question, limit);

  if (retrievedChunks.length === 0) {
    return {
      answer:
        "I couldn't find any relevant information in the knowledge base to answer your question. You may want to try rephrasing your question or checking if the information exists in the documents.",
      sources: [],
    };
  }

  const llmResponse = await queryLLM(question, retrievedChunks);

  return {
    answer: llmResponse.answer,
    sources: retrievedChunks,
    tokensUsed: llmResponse.tokensUsed,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let question: string;
  let limit = 5;

  if (args.length === 0) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    question = await new Promise<string>((resolve) => {
      rl.question("🤔 Ask me anything: ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  } else {
    question = args.filter((arg) => !arg.startsWith("--")).join(" ");

    const limitArg = args.find((arg) => arg.startsWith("--limit="));
    if (limitArg) {
      limit = parseInt(limitArg.split("=")[1] ?? "5") || 5;
    }
  }

  if (!question) {
    console.error("❌ No question provided");
    console.log("Usage:");
    console.log('  tsx scripts/rag-test.ts "your question here"');
    console.log('  tsx scripts/rag-test.ts "your question" --limit=10');
    console.log("  tsx scripts/rag-test.ts  (for interactive mode)");
    process.exit(1);
  }

  const response = await performRAGQuery(question, { limit });
  displayRAGResponse(response, question);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

export { queryLLM as queryRAGLLM };
