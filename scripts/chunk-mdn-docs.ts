#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import matter from "gray-matter";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zod schemas
const headingContextSchema = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string().min(1),
  lineNumber: z.number().int().positive(),
});

const structureItemSchema = z.object({
  lineNumber: z.number().int().positive(),
  content: z.string(),
  heading: headingContextSchema.nullable(),
});

const lineNumbersSchema = z.object({
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
});

const documentMetadataSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    "page-type": z.string().optional(),
    sidebar: z.string().optional(),
  })
  .loose();

const chunkMetadataSchema = z.object({
  source: z.string().min(1),
  filePath: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  documentMetadata: documentMetadataSchema,
  headingContext: headingContextSchema.nullable(),
  characterCount: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
});

const chunkSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  metadata: chunkMetadataSchema,
});

const outputMetadataSchema = z.object({
  totalChunks: z.number().int().nonnegative(),
  generatedAt: z.iso.datetime(),
  chunkingStrategy: z.string().min(1),
  chunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
});

const chunksOutputSchema = z.object({
  metadata: outputMetadataSchema,
  chunks: z.array(chunkSchema),
});

// Inferred types
type HeadingContext = z.infer<typeof headingContextSchema>;
type StructureItem = z.infer<typeof structureItemSchema>;
type LineNumbers = z.infer<typeof lineNumbersSchema>;
type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
type ChunkMetadata = z.infer<typeof chunkMetadataSchema>;
type Chunk = z.infer<typeof chunkSchema>;
type OutputMetadata = z.infer<typeof outputMetadataSchema>;
type ChunksOutput = z.infer<typeof chunksOutputSchema>;

class DocumentChunker {
  private textSplitter: RecursiveCharacterTextSplitter;
  private chunks: Chunk[];

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: [
        "\n## ", // H2 headers
        "\n### ", // H3 headers
        "\n#### ", // H4 headers
        "\n##### ", // H5 headers
        "\n\n", // Double newlines (paragraph breaks)
        "\n", // Single newlines
        " ", // Spaces
        "", // Characters
      ],
      keepSeparator: true,
    });

    this.chunks = [];
  }

  /**
   * Recursively find all markdown files in a directory
   */
  findMarkdownFiles(dirPath: string): string[] {
    const files: string[] = [];

    function traverse(currentPath: string): void {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (stat.isFile() && item.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    }

    traverse(dirPath);
    return files;
  }

  /**
   * Parse markdown content and extract line-based structure
   */
  parseMarkdownStructure(content: string): StructureItem[] {
    const lines = content.split("\n");
    const structure: StructureItem[] = [];
    let currentHeading: HeadingContext | null = null;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);

      if (headingMatch?.[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        currentHeading = {
          level,
          text,
          lineNumber,
        };
      }

      structure.push({
        lineNumber,
        content: line,
        heading: currentHeading ? { ...currentHeading } : null,
      });
    });

    return structure;
  }

  /**
   * Find the appropriate heading context for a chunk
   */
  findHeadingContext(
    structure: StructureItem[],
    startLine: number,
    _endLine: number,
  ): HeadingContext | null {
    let relevantHeading: HeadingContext | null = null;

    // Look backwards from the start line to find the most recent heading
    for (let i = startLine - 1; i >= 0; i--) {
      const structureItem = structure[i];
      if (structureItem?.heading && /^#{1,6}\s+/.exec(structureItem.content)) {
        relevantHeading = structureItem.heading;
        break;
      }
    }

    return relevantHeading;
  }

  /**
   * Calculate line numbers for a chunk within the original document
   * Accounts for frontmatter offset
   */
  calculateChunkLineNumbers(
    originalContent: string,
    chunkContent: string,
    frontmatterOffset = 0,
  ): LineNumbers {
    const originalLines = originalContent.split("\n");
    const chunkLines = chunkContent.split("\n");

    // Find the first occurrence of the chunk in the original content
    for (let i = 0; i <= originalLines.length - chunkLines.length; i++) {
      let matches = true;

      for (let j = 0; j < chunkLines.length; j++) {
        if (originalLines[i + j]?.trim() !== chunkLines[j]?.trim()) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return {
          startLine: i + 1 + frontmatterOffset,
          endLine: i + chunkLines.length + frontmatterOffset,
        };
      }
    }

    // Fallback: try to find partial matches
    const firstChunkLine = chunkLines[0]?.trim();
    const lastChunkLine = chunkLines[chunkLines.length - 1]?.trim();

    if (firstChunkLine) {
      for (let i = 0; i < originalLines.length; i++) {
        if (originalLines[i]?.trim() === firstChunkLine) {
          // Found start, now find end
          for (let j = i; j < originalLines.length; j++) {
            if (originalLines[j]?.trim() === lastChunkLine) {
              return {
                startLine: i + 1 + frontmatterOffset,
                endLine: j + 1 + frontmatterOffset,
              };
            }
          }
          // If we can't find the end, estimate based on chunk length
          return {
            startLine: i + 1 + frontmatterOffset,
            endLine:
              Math.min(i + chunkLines.length, originalLines.length) +
              frontmatterOffset,
          };
        }
      }
    }

    // Ultimate fallback
    return {
      startLine: 1 + frontmatterOffset,
      endLine: chunkLines.length + frontmatterOffset,
    };
  }

  /**
   * Process a single markdown file
   */
  async processFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = matter(content);
      const relativePath = path.relative(path.join(__dirname, ".."), filePath);

      // Calculate frontmatter offset (number of lines the frontmatter takes up)
      const frontmatterOffset =
        content.split("\n").length - parsed.content.split("\n").length;

      // Parse document structure for heading context
      const structure = this.parseMarkdownStructure(content);

      // Split the content into chunks
      const textChunks = await this.textSplitter.splitText(parsed.content);

      // Process each chunk
      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];
        if (!chunkContent) continue;

        const lineNumbers = this.calculateChunkLineNumbers(
          parsed.content,
          chunkContent,
          frontmatterOffset,
        );
        const headingContext = this.findHeadingContext(
          structure,
          lineNumbers.startLine,
          lineNumbers.endLine,
        );

        const chunk: Chunk = {
          id: `${relativePath}_chunk_${i}`,
          content: chunkContent,
          metadata: {
            source: relativePath,
            filePath,
            chunkIndex: i,
            totalChunks: textChunks.length,
            startLine: lineNumbers.startLine,
            endLine: lineNumbers.endLine,
            documentMetadata: parsed.data as DocumentMetadata,
            headingContext: headingContext
              ? {
                  text: headingContext.text,
                  level: headingContext.level,
                  lineNumber: headingContext.lineNumber,
                }
              : null,
            characterCount: chunkContent.length,
            wordCount: chunkContent
              .split(/\s+/)
              .filter((word) => word.length > 0).length,
          },
        };

        this.chunks.push(chunk);
      }

      console.log(`✓ Processed ${filePath} - ${textChunks.length} chunks`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`✗ Error processing ${filePath}:`, errorMessage);
    }
  }

  /**
   * Process all markdown files in the mdn-docs directory
   */
  async processAllFiles(): Promise<void> {
    const mdnDocsPath = path.join(__dirname, "..", "mdn");

    if (!fs.existsSync(mdnDocsPath)) {
      throw new Error(`MDN docs directory not found: ${mdnDocsPath}`);
    }

    console.log("🔍 Finding markdown files...");
    const markdownFiles = this.findMarkdownFiles(mdnDocsPath);
    console.log(`📄 Found ${markdownFiles.length} markdown files`);

    console.log("\n📝 Processing files...");
    for (const file of markdownFiles) {
      await this.processFile(file);
    }

    console.log(
      `\n✅ Processing complete! Generated ${this.chunks.length} chunks`,
    );
  }

  /**
   * Save chunks to JSON file
   */
  saveChunks(outputPath = "chunks.json"): void {
    const outputFilePath = path.join(__dirname, "..", outputPath);

    const output: ChunksOutput = {
      metadata: {
        totalChunks: this.chunks.length,
        generatedAt: new Date().toISOString(),
        chunkingStrategy:
          "RecursiveCharacterTextSplitter with Document Structure Based Chunking",
        chunkSize: 1000,
        chunkOverlap: 200,
      },
      chunks: this.chunks,
    };

    const validated = chunksOutputSchema.parse(output);
    fs.writeFileSync(outputFilePath, JSON.stringify(validated, null, 2));
    console.log(`💾 Saved ${this.chunks.length} chunks to ${outputFilePath}`);
  }

  /**
   * Get the current chunks
   */
  getChunks(): Chunk[] {
    return this.chunks;
  }

  /**
   * Clear all chunks
   */
  clearChunks(): void {
    this.chunks = [];
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log("🚀 Starting document chunking process...\n");

    const chunker = new DocumentChunker();
    await chunker.processAllFiles();
    chunker.saveChunks();

    console.log("\n🎉 Document chunking completed successfully!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error during chunking process:", errorMessage);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.log(e);
  });
}

export { DocumentChunker };
export {
  headingContextSchema,
  structureItemSchema,
  lineNumbersSchema,
  documentMetadataSchema,
  chunkMetadataSchema,
  chunkSchema,
  outputMetadataSchema,
  chunksOutputSchema,
};
export type {
  HeadingContext,
  StructureItem,
  LineNumbers,
  DocumentMetadata,
  ChunkMetadata,
  Chunk,
  OutputMetadata,
  ChunksOutput,
};
