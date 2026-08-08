import OpenAI from 'openai'

const APIM_BASE_URL = process.env.APIM_BASE_URL?.replace(/\/$/, '')
const APIM_KEY = process.env.APIM_KEY
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gpt-5.4'

if (!APIM_BASE_URL || !APIM_KEY) {
  throw new Error('APIM_BASE_URL / APIM_KEY가 .env에 설정되어 있지 않습니다. .env.example을 참고하세요.')
}

// APIM Foundry Proxy는 Authorization 헤더 대신 "api-key" 헤더로 인증하고,
// 모델별로 base URL 경로가 나뉜다. apiKey는 SDK가 요구해서 넣는 더미 값이다.
export const foundryClient = new OpenAI({
  apiKey: 'placeholder',
  baseURL: `${APIM_BASE_URL}/${CHAT_MODEL}/`,
  defaultHeaders: { 'api-key': APIM_KEY },
})

export const CHAT_MODEL_NAME = CHAT_MODEL
