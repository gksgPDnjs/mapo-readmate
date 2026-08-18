type QuizQuestion = {
  id: string;
  options: Array<{ id: string; code: string }>;
};

type DemoResult = {
  publicCode?: string;
  trait?: { code?: string };
  recommendations?: Array<{ role?: string; title?: string; explanation?: string | null }>;
};

const apiBaseUrl = process.env.RECOMMENDATION_API_URL ?? "http://localhost:3001";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  return response;
}

const quiz = await (await request("/api/quiz/active")).json() as { questions?: QuizQuestion[] };
assert(Array.isArray(quiz.questions) && quiz.questions.length === 12, "Expected twelve active first-stage questions.");

const session = await (await request("/api/sessions", { method: "POST" })).json() as { id?: string };
assert(session.id, "Session creation did not return an id.");

for (const question of quiz.questions) {
  const option = question.options.find((candidate) => candidate.code === "a3");
  assert(option, "A first-stage question is missing its a3 option.");
  await request(`/api/sessions/${session.id}/responses`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: question.id, optionId: option.id }),
  });
}

// 1차 완료는 성향 카드만 계산한다 — 추천 도서/publicCode는 2차(finalize)까지 마쳐야 나온다.
const completed = await (await request(`/api/sessions/${session.id}/complete`, { method: "POST" })).json() as DemoResult;
assert(completed.trait?.code, "Completion did not return a trait.");
assert(!completed.publicCode && !completed.recommendations, "First-stage completion should not yet produce recommendations/publicCode.");

const finalized = await (await request(`/api/sessions/${session.id}/finalize`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ preferredFeatureCodes: ["G_NOVEL"], avoidedFeatureCodes: [], limit: 3 }),
})).json() as DemoResult;
assert(finalized.publicCode, "Finalize did not return a public code.");
assert(finalized.recommendations?.length === 3, "Finalize did not produce three recommendations.");
assert(new Set(finalized.recommendations.map((book) => book.role)).size === 3, "Recommendations do not have distinct roles.");
assert(finalized.recommendations.every((book) => book.title && book.explanation), "A recommendation is missing its title or explanation.");

const result = await (await request(`/api/results/${finalized.publicCode}`)).json() as DemoResult;
assert(result.publicCode === finalized.publicCode, "Public result lookup returned the wrong result.");
assert(result.recommendations?.length === 3, "Public result lookup did not return three recommendations.");
assert(
  JSON.stringify(result.recommendations?.map((book) => book.title)) === JSON.stringify(finalized.recommendations.map((book) => book.title)),
  "QR/public result does not match the recommendations shown at finalize time.",
);

await request("/api/feedback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: session.id, eventType: "item_viewed" }),
});
const stats = await (await request("/api/admin/demo-stats")).json() as { completedSessions?: number; recommendationItems?: number };
assert((stats.completedSessions ?? 0) > 0 && (stats.recommendationItems ?? 0) >= 3, "Demo statistics do not include the completed session.");

console.log(`Demo flow passed: ${completed.trait.code}, ${finalized.recommendations.map((book) => book.title).join(", ")}.`);