import { existsSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NationalLibraryProvider } from "../book-catalog/providers/national-library.provider.js";
import { OpenLibraryProvider } from "../book-catalog/providers/open-library.provider.js";
import type { BookProvider, CanonicalBookCandidate } from "../book-catalog/providers/types.js";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const sourceSchema = z.enum(["open_library", "national_library"]);

function getProvider(source: z.infer<typeof sourceSchema>): BookProvider {
  if (source === "national_library") {
    const certKey = process.env.NATIONAL_LIBRARY_CERT_KEY;
    if (!certKey || certKey === "issued-api-key") {
      throw new Error("NATIONAL_LIBRARY_CERT_KEY must be configured to use the national_library source.");
    }
    return new NationalLibraryProvider(certKey);
  }
  return new OpenLibraryProvider();
}

function serializeCandidate(candidate: CanonicalBookCandidate) {
  return {
    externalId: candidate.externalId,
    title: candidate.title,
    isbn13: candidate.isbn13,
    author: candidate.author,
    publisher: candidate.publisher,
    publishedOn: candidate.publishedOn,
    pageCount: candidate.pageCount,
    format: candidate.format,
  };
}

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  return {
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Book lookup failed." }],
    isError: true,
  };
}

const server = new McpServer({ name: "readmate-book-catalog", version: "0.1.0" });

server.registerTool(
  "search_books",
  {
    title: "Search external book metadata",
    description: "Searches a configured bibliographic source. Results are unreviewed metadata candidates and must be verified before publishing to the catalog.",
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200).optional(),
      isbn13: z.string().trim().min(10).max(20).optional(),
      source: sourceSchema.default("open_library"),
      limit: z.number().int().min(1).max(10).default(5),
    }).refine((value) => Boolean(value.title || value.isbn13), "Provide title or isbn13."),
  },
  async ({ title, isbn13, source, limit }) => {
    try {
      const candidates = await getProvider(source).search({ title, isbn13, pageSize: limit });
      return textResult({ source, books: candidates.slice(0, limit).map(serializeCandidate) });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "find_book_by_isbn",
  {
    title: "Find external book metadata by ISBN-13",
    description: "Looks up one bibliographic candidate by ISBN-13. Results are unreviewed metadata candidates and must be verified before publishing to the catalog.",
    inputSchema: z.object({
      isbn13: z.string().trim().min(10).max(20),
      source: sourceSchema.default("open_library"),
    }),
  },
  async ({ isbn13, source }) => {
    try {
      const candidate = await getProvider(source).findByIsbn(isbn13);
      return textResult({ source, book: candidate ? serializeCandidate(candidate) : null });
    } catch (error) {
      return errorResult(error);
    }
  },
);

await server.connect(new StdioServerTransport());