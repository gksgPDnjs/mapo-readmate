type Diagnostics = {
  catalog?: { works?: number; editions?: number; publishedWorks?: number; publishedEditions?: number };
  features?: { approvedValues?: number };
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
const publishedWorkCount = diagnostics.catalog?.publishedWorks ?? 0;
const publishedEditionCount = diagnostics.catalog?.publishedEditions ?? 0;
const approvedFeatureValueCount = diagnostics.features?.approvedValues ?? 0;

if (
  openLibraryRecords < 500 || workCount < 500 || editionCount < 500
  || publishedWorkCount < 500 || publishedEditionCount < 500 || approvedFeatureValueCount < 1_000
) {
  throw new Error(`Expected 500 Open Library recommendation-ready records. Found ${openLibraryRecords} source records, ${workCount}/${editionCount} total works/editions, ${publishedWorkCount}/${publishedEditionCount} published works/editions, and ${approvedFeatureValueCount} approved feature values.`);
}

console.log(`Catalog readiness passed: ${openLibraryRecords} Open Library records, ${publishedWorkCount}/${publishedEditionCount} published works/editions, ${approvedFeatureValueCount} approved feature values.`);
