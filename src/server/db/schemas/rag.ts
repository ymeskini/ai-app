import { relations } from "drizzle-orm";
import { messageSources } from "./chat";
import {
  customType,
  integer,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { createTable, primaryId } from "./table";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const documents = createTable("document", {
  id: primaryId(),
  title: text("title").notNull(),
  slug: text("slug"),
  sourceFilePath: text("source_file_path").notNull(),
  pageType: text("page_type"),
  sidebar: text("sidebar"),
  totalChunks: integer("total_chunks").notNull().default(0),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chunks = createTable("chunk", {
  id: text("id").primaryKey(), // e.g., "mdn-docs/closures/index.md_chunk_0"
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  startLine: integer("start_line"),
  endLine: integer("end_line"),
  headingContextText: text("heading_context_text"),
  headingContextLevel: integer("heading_context_level"),
  headingLineNumber: integer("heading_line_number"),
  characterCount: integer("character_count").notNull(),
  wordCount: integer("word_count").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  contextPrefix: text("context_prefix"),
  searchVector: tsvector("search_vector"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one, many }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
  messageSources: many(messageSources),
}));
