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

const completed = await (await request(`/api/sessions/${session.id}/complete`, { method: "POST" })).json() as DemoResult;
assert(completed.publicCode && completed.trait?.code, "Completion did not return a public code and trait.");
assert(completed.recommendations?.length === 3, "Completion did not produce three recommendations.");
assert(new Set(completed.recommendations.map((book) => book.role)).size === 3, "Recommendations do not have distinct roles.");
assert(completed.recommendations.every((book) => book.title && book.explanation), "A recommendation is missing its title or explanation.");

const result = await (await request(`/api/results/${completed.publicCode}`)).json() as DemoResult;
assert(result.publicCode === completed.publicCode, "Public result lookup returned the wrong result.");
assert(result.recommendations?.length === 3, "Public result lookup did not return three recommendations.");

await request("/api/feedback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: session.id, eventType: "item_viewed" }),
});
const stats = await (await request("/api/admin/demo-stats")).json() as { completedSessions?: number; recommendationItems?: number };
assert((stats.completedSessions ?? 0) > 0 && (stats.recommendationItems ?? 0) >= 3, "Demo statistics do not include the completed session.");

console.log(`Demo flow passed: ${completed.trait.code}, ${completed.recommendations.map((book) => book.title).join(", ")}.`);