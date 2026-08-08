import OpenAI from "openai";

type QaPair = { question: string; answer: string };

// env는 지연 평가한다 — 모듈 로드 시점에 process.env를 읽으면 .env가
// 아직 로드되기 전일 수 있어서(순서 버그), 실제 호출 시점에만 읽는다.
function createClient() {
  const baseUrl = process.env.APIM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.APIM_KEY;
  const model = process.env.CHAT_MODEL ?? "gpt-5.4";
  if (!baseUrl || !apiKey) return null;
  return {
    client: new OpenAI({ apiKey: "placeholder", baseURL: `${baseUrl}/${model}/`, defaultHeaders: { "api-key": apiKey } }),
    model,
  };
}

export async function determineTraitCodeByAi(
  qa: QaPair[],
  typeSummary: string,
  validCodes: Set<string>,
): Promise<string> {
  const config = createClient();
  if (!config) throw new Error("APIM_BASE_URL / APIM_KEY가 설정되어 있지 않습니다.");

  const qaText = qa.map((item, index) => `${index + 1}. ${item.question}\n   답변: ${item.answer}`).join("\n");
  const prompt = `당신은 초등학생 대상 독서 성향 분석가입니다. 아래는 사용자가 12개 질문에 답한 내용입니다.

${qaText}

아래 16개 독서 성향 타입 중 답변 내용과 가장 잘 맞는 타입 코드 하나만 고르세요.

${typeSummary}

반드시 아래 JSON 형식으로만 답하세요. 다른 설명은 붙이지 마세요.
{"code": "네 글자 타입 코드"}`;

  const response = await config.client.responses.create({
    model: config.model,
    input: prompt,
    max_output_tokens: 200,
  });

  const text = response.output_text ?? "";
  const match = text.match(/[A-Z]{4}/);
  const code = match?.[0];
  if (!code || !validCodes.has(code)) {
    throw new Error(`AI가 유효하지 않은 타입 코드를 반환했습니다: ${text}`);
  }
  return code;
}
