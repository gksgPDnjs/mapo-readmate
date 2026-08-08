# Static Data Leak

| ID | 대상 | Actual | Status |
| --- | --- | --- | --- |
| UI-DATA-001 | 1차 질문 | 정적 fixture가 runtime 사용됨 | FAIL |
| UI-DATA-002 | 성향 결과 | createTrait(answers) 사용 | PASS |
| UI-DATA-003 | 추천 도서 | API recommendations prop 사용 | PASS |
| UI-DATA-004 | 2차 질문 | DB API 사용 | PASS |
| REFERENCE | 정적 fixture 파일 | questions=2030, traits=541, books=394 | INFO |

정적 파일이 저장소에 존재하는 것과 runtime 사용은 구분했다. 1차 질문은 실제 runtime에서 정적 파일을 사용하므로 FAIL이다.
