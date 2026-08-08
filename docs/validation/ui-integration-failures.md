# UI Integration Failures

- UI-001 HIGH: 1차 질문은 static fixture이며 DB 저장 endpoint가 없어 refresh, back, restart 시 답변 traceability를 보장할 수 없다.
- UI-002 BLOCKED: Playwright가 설치되지 않아 375x667부터 1440x900까지 screenshot overflow 검증을 실행하지 못했다.
- UI-003 PASS: 추천 화면은 API prop의 title, author, description, explanation을 사용하며 null author/description fallback을 가진다.
- UI-004 PASS: 표지는 DB cover URL이 아니라 title-based fallback component를 사용하므로 깨진 외부 이미지 요청은 없다.
