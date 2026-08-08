type Diagnostics = {
  catalog?: { works?: number; editions?: number };
  sources?: Array<{ code?: string; recordCount?: number }>;
};

const apiBaseUrl = process.env.RECOMMENDATION_API_URL ?? "http://localhost:3001";
const response = await fetch(`${apiBaseUrl}/api/catalog/diagnostics`);
if (!response.ok) {
  throw new Error(`Catalog diagnostics returned HTTP ${response.status}.`);
}
const diagnostics = await response.json() as Diagnostics;
const openLibraryRecords = diagnostics.sources?.find((source) => source.code === "open_library")?.recordCount ?? 0;
const workCount = diagnostics.catalog?.works ?? 0;
const editionCount = diagnostics.catalog?.editions ?? 0;

if (openLibraryRecords < 500 || workCount < 500 || editionCount < 500) {
  throw new Error(`Expected at least 500 Open Library review records. Found ${openLibraryRecords} source records, ${workCount} works, ${editionCount} editions.`);
}

console.log(`Catalog volume passed: ${openLibraryRecords} Open Library records, ${workCount} works, ${editionCount} editions.`);
