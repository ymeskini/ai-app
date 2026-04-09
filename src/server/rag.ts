import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embed } from "ai";

import { db } from "~/server/db";
import { embeddingModel } from "~/server/model";
import { chunks, documents } from "~/server/db/schemas/rag";
import { generateMDNUrl } from "~/app/helpers/general";

const SIMILARITY_THRESHOLD = 0.3;

export interface RAGSearchResult {
  chunkId: string;
  documentTitle: string;
  documentSlug: string | null;
  sourceFilePath: string;
  content: string;
  similarity: number;
  headingContext: string | null;
  url: string;
}

export async function performSemanticSearch(
  query: string,
  limit = 5,
): Promise<RAGSearchResult[]> {
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

  return rows.map((row) => ({
    ...row,
    url: generateMDNUrl(row.documentSlug, row.headingContext),
  }));
}
