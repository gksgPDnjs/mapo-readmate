import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const transport = new StdioClientTransport({
  command,
  args: ["--no-install", "tsx", "src/mcp/book-catalog-server.ts"],
  cwd: process.cwd(),
  stderr: "pipe",
});
const client = new Client({ name: "readmate-mcp-check", version: "0.1.0" });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert(tools.some((tool) => tool.name === "search_books"), "search_books was not exposed by the MCP server.");
  assert(tools.some((tool) => tool.name === "find_book_by_isbn"), "find_book_by_isbn was not exposed by the MCP server.");

  const result = await client.callTool({
    name: "search_books",
    arguments: { title: "fiction", source: "open_library", limit: 1 },
  });
  assert(!result.isError, "search_books returned an MCP error.");
  const content = result.content;
  assert(Array.isArray(content), "search_books returned invalid content.");
  const text = content.find((item: unknown): item is { type: "text"; text: string } => (
    typeof item === "object"
    && item !== null
    && "type" in item
    && "text" in item
    && item.type === "text"
    && typeof item.text === "string"
  ));
  assert(text, "search_books returned no text content.");
  const payload = JSON.parse(text.text) as { books?: unknown[] };
  assert(Array.isArray(payload.books) && payload.books.length > 0, "search_books returned no book candidates.");

  console.log(`MCP book tools passed: ${tools.length} tools exposed, ${payload.books.length} external candidate returned.`);
} finally {
  await client.close();
}