import "dotenv/config";

import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { embed } from "ai";
import postgres from "postgres";

import { embeddingModel } from "../src/server/model";
import * as schema from "../src/server/db/schemas";
import { chunks, documents } from "../src/server/db/schemas/rag";

const SIMILARITY_THRESHOLD = 0.3;

export interface SearchResult {
  chunkId: string;
  documentTitle: string;
  documentSlug: string | null;
  sourceFilePath: string;
  content: string;
  similarity: number;
  headingContext: string | null;
}

export async function performSemanticSearch(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
      providerOptions: { voyage: { inputType: "query" } },
    });

    const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryEmbedding)})`;

    const rows = await db
      .select({
        chunkId: chunks.id,
        content: chunks.content,
        similarity,
        headingContext: chunks.headingContextText,
        documentTitle: documents.title,
        documentSlug: documents.slug,
        sourceFilePath: documents.sourceFilePath,
      })
      .from(chunks)
      .innerJoin(documents, sql`${chunks.documentId} = ${documents.id}`)
      .where(gt(similarity, SIMILARITY_THRESHOLD))
      .orderBy(desc(similarity))
      .limit(limit);

    return rows;
  } finally {
    await client.end();
  }
}
