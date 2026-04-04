import "dotenv/config";

import { createInterface } from "node:readline";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { embed, streamText } from "ai";
import postgres from "postgres";

import { embeddingModel, model } from "../src/server/model";
import * as schema from "../src/server/db/schemas";
import { chunks, documents } from "../src/server/db/schemas/rag";

const SIMILARITY_THRESHOLD = 0.3;
const TOP_K = 5;

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function retrieveChunks(
  question: string,
  db: ReturnType<typeof drizzle>,
) {
  const { embedding: queryEmbedding } = await embed({
    model: embeddingModel,
    value: question,
    providerOptions: { voyage: { inputType: "query" } },
  });

  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryEmbedding)})`;

  return db
    .select({
      content: chunks.content,
      similarity,
      headingContext: chunks.headingContextText,
      documentTitle: documents.title,
      sourceFilePath: documents.sourceFilePath,
    })
    .from(chunks)
    .innerJoin(documents, sql`${chunks.documentId} = ${documents.id}`)
    .where(gt(similarity, SIMILARITY_THRESHOLD))
    .orderBy(desc(similarity))
    .limit(TOP_K);
}

function printSeparator(char = "─", width = 60) {
  console.log(char.repeat(width));
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const question = await ask("Question: ");
  if (!question) {
    console.error("No question provided.");
    await client.end();
    process.exit(1);
  }

  console.log("\nRetrieving relevant chunks...");

  const retrieved = await retrieveChunks(question, db);

  if (retrieved.length === 0) {
    console.log("No relevant chunks found above similarity threshold.");
    await client.end();
    return;
  }

  console.log(`\nFound ${retrieved.length} relevant chunks:\n`);
  printSeparator();

  const context = retrieved
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.documentTitle}${chunk.headingContext ? ` — ${chunk.headingContext}` : ""}]\n${chunk.content}`,
    )
    .join("\n\n---\n\n");

  const prompt = `You are a helpful assistant. Answer the user's question using ONLY the provided context. If the context does not contain enough information to answer, say so clearly — do not make up information.
  <context>
  ${context}
  </context>
  Question: ${question}
  `;

  console.log("\nGenerating answer...\n");
  printSeparator();

  const { textStream } = streamText({ model, prompt });

  for await (const chunk of textStream) {
    process.stdout.write(chunk);
  }
  console.log();
  printSeparator();

  await client.end();
}

main().catch((err: unknown) => {
  console.error("RAG test failed:", err);
  process.exit(1);
});
