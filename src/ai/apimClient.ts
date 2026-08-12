import OpenAI from "openai";

// env는 지연 평가한다 — 모듈 로드 시점에 process.env를 읽으면 .env가
// 아직 로드되기 전일 수 있어서(순서 버그), 실제 호출 시점에만 읽는다.
// 키가 없으면 null을 반환해서 호출부가 안전하게 폴백할 수 있게 한다.
export function createApimClient() {
  const baseUrl = process.env.APIM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.APIM_KEY;
  const model = process.env.CHAT_MODEL ?? "gpt-5.4";
  if (!baseUrl || !apiKey) return null;
  return {
    client: new OpenAI({ apiKey: "placeholder", baseURL: `${baseUrl}/${model}/`, defaultHeaders: { "api-key": apiKey } }),
    model,
  };
}
