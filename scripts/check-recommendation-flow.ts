type HttpResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type Recommendation = {
  workId: string;
  title: string;
  author: string | null;
  description: string | null;
  score: number;
  matchedFeatureCodes: string[];
};

type RecommendationResponse = {
  recommendations?: Recommendation[];
  ignoredPreferredFeatureCodes?: string[];
};

const apiBaseUrl = process.env.RECOMMENDATION_API_URL ?? "http://localhost:3001";
const previewRequest = {
  preferredFeatureCodes: ["G_NOVEL", "M_CALM", "DIFF_MEDIUM", "TONE_POETIC", "VIS_TEXT", "UTIL_EMPATHY"],
  avoidedFeatureCodes: [],
  limit: 3,
};

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const response: HttpResponse = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }
  return response.json();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const health = await fetchJson("/health") as { status?: string; database?: string };
assert(health.status === "ok" && health.database === "connected", "Database health check did not report a connected database.");

const questionPayload = await fetchJson("/api/deep-questions") as { questions?: Array<{ code?: string; options?: unknown[] }> };
assert(Array.isArray(questionPayload.questions) && questionPayload.questions.length === 8, "Expected eight deep recommendation questions.");
assert(questionPayload.questions.every((question) => question.code && Array.isArray(question.options) && question.options.length > 0), "A deep question is missing its code or options.");

const recommendationPayload = await fetchJson("/api/recommendations/preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(previewRequest),
}) as RecommendationResponse;
const recommendations = recommendationPayload.recommendations;
assert(Array.isArray(recommendations) && recommendations.length > 0, "Expected at least one recommendation for the demo preference profile.");
assert(new Set(recommendations.map((book) => book.workId)).size === recommendations.length, "Recommendation results contain duplicate works.");
assert(recommendations.every((book) => book.title && book.author && book.description && book.score > 0 && book.matchedFeatureCodes.length > 0), "A recommendation is missing required display or matching data.");

const unknownFeaturePayload = await fetchJson("/api/recommendations/preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ preferredFeatureCodes: ["NOT_A_FEATURE"], avoidedFeatureCodes: [], limit: 3 }),
}) as RecommendationResponse;
assert(unknownFeaturePayload.ignoredPreferredFeatureCodes?.includes("NOT_A_FEATURE"), "Unsupported feature codes are not reported to the client.");

console.log(`Recommendation flow passed: ${recommendations.length} DB-backed books, ${questionPayload.questions.length} questions.`);
