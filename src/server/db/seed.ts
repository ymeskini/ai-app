import "dotenv/config";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { embedMany } from "ai";
import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import { isNotNull } from "drizzle-orm";
import postgres from "postgres";

import { embeddingModel } from "../model";
import * as schema from "./schemas";
import { chunks, documents } from "./schemas/rag";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DocumentMetadata {
  title: string;
  slug: string;
  "page-type": string;
  sidebar: string;
}

interface HeadingContext {
  level: number;
  text: string;
  lineNumber: number;
}

interface ChunkMetadata {
  source: string;
  chunkIndex: number;
  totalChunks: number;
  startLine: number;
  endLine: number;
  documentMetadata: DocumentMetadata;
  headingContext: HeadingContext | null;
  characterCount: number;
  wordCount: number;
}

interface Chunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
}

interface ChunksFile {
  metadata: { totalChunks: number; generatedAt: string };
  chunks: Chunk[];
}

const BATCH_SIZE = 50;
// Voyage AI free tier: 3 RPM — wait for remainder of the window between calls
const EMBED_RATE_LIMIT_MS = 21_000;

let lastEmbedAt = 0;

async function embedWithRateLimit(values: string[]): Promise<number[][]> {
  const elapsed = Date.now() - lastEmbedAt;
  const wait = Math.max(0, EMBED_RATE_LIMIT_MS - elapsed);
  if (wait > 0) {
    process.stdout.write(
      `  Rate limit: waiting ${Math.ceil(wait / 1000)}s... `,
    );
    await new Promise((res) => setTimeout(res, wait));
    process.stdout.write("done\n");
  }
  lastEmbedAt = Date.now();
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values,
    providerOptions: { voyage: { inputType: "document" } },
  });
  return embeddings;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  // --- Cache existing embeddings before reset ---
  console.log("Caching existing embeddings...");
  const existing = await db
    .select({ id: chunks.id, embedding: chunks.embedding })
    .from(chunks)
    .where(isNotNull(chunks.embedding));
  const embeddingCache = new Map(
    existing.map((c) => [c.id, c.embedding!] as [string, number[]]),
  );
  console.log(`Cached ${embeddingCache.size} embeddings.\n`);

  // --- Reset RAG tables (respects FK order) ---
  console.log("Resetting RAG tables...");
  await reset(db, { documents, chunks });
  console.log("Reset complete.\n");

  // --- Load chunks.json ---
  const chunksFilePath = resolve(__dirname, "../../../chunks.json");
  const chunksFile = JSON.parse(
    readFileSync(chunksFilePath, "utf-8"),
  ) as ChunksFile;

  console.log(
    `Loaded ${chunksFile.chunks.length} chunks (generated ${chunksFile.metadata.generatedAt})`,
  );

  // Group chunks by source document
  const documentMap = new Map<
    string,
    { metadata: DocumentMetadata; totalChunks: number; chunks: Chunk[] }
  >();

  for (const chunk of chunksFile.chunks) {
    const { source } = chunk.metadata;
    const existingDoc = documentMap.get(source);
    if (!existingDoc) {
      documentMap.set(source, {
        metadata: chunk.metadata.documentMetadata,
        totalChunks: chunk.metadata.totalChunks,
        chunks: [chunk],
      });
    } else {
      existingDoc.chunks.push(chunk);
    }
  }

  console.log(`Found ${documentMap.size} unique documents\n`);

  // --- Insert documents then their chunks ---
  let docsInserted = 0;
  let chunksInserted = 0;
  let embeddingCacheHits = 0;
  let embeddingApiCalls = 0;

  for (const [sourceFilePath, docData] of documentMap) {
    const [insertedDoc] = await db
      .insert(documents)
      .values({
        title: docData.metadata.title,
        slug: docData.metadata.slug,
        sourceFilePath,
        pageType: docData.metadata["page-type"],
        sidebar: docData.metadata.sidebar,
        totalChunks: docData.totalChunks,
      })
      .returning();

    docsInserted++;
    console.log(
      `[${docsInserted}/${documentMap.size}] ${docData.metadata.title} (${docData.chunks.length} chunks)`,
    );

    for (let i = 0; i < docData.chunks.length; i += BATCH_SIZE) {
      const batch = docData.chunks.slice(i, i + BATCH_SIZE);

      // Only call the API for chunks not already in cache
      const toEmbed = batch.filter((c) => !embeddingCache.has(c.id));
      if (toEmbed.length > 0) {
        const embeddings = await embedWithRateLimit(
          toEmbed.map((c) => c.content),
        );
        toEmbed.forEach((chunk, idx) => {
          embeddingCache.set(chunk.id, embeddings[idx]!);
        });
        embeddingApiCalls++;
      }

      embeddingCacheHits += batch.length - toEmbed.length;

      await db.insert(chunks).values(
        batch.map((chunk) => ({
          id: chunk.id,
          documentId: insertedDoc!.id,
          content: chunk.content,
          chunkIndex: chunk.metadata.chunkIndex,
          startLine: chunk.metadata.startLine,
          endLine: chunk.metadata.endLine,
          headingContextText: chunk.metadata.headingContext?.text ?? null,
          headingContextLevel: chunk.metadata.headingContext?.level ?? null,
          headingLineNumber: chunk.metadata.headingContext?.lineNumber ?? null,
          characterCount: chunk.metadata.characterCount,
          wordCount: chunk.metadata.wordCount,
          embedding: embeddingCache.get(chunk.id) ?? null,
        })),
      );
      chunksInserted += batch.length;
    }
  }

  console.log(
    `\nDone: ${docsInserted} documents, ${chunksInserted} chunks inserted.`,
  );
  console.log(
    `Embeddings: ${embeddingCacheHits} from cache, ${embeddingApiCalls} API batches.`,
  );
  await client.end();
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
