# Validation Test Matrix

| ID | Category | Expected | Actual | Status | Severity |
| --- | --- | --- | --- | --- | --- |
| DB-001 | DB | 510 catalog records measurable | 510 work/edition rows | PASS | - |
| DATA-001 | BOOK DATA | high metadata coverage | eligible 10/510 | FAIL | HIGH |
| QUESTION-001 | QUESTION | runtime questions from DB | 2차 PASS, 1차 static | FAIL | HIGH |
| PROFILE-001 | PROFILE | click -> DB profile trace | 0 attempts/responses/snapshots | FAIL | HIGH |
| REC-001 | RECOMMENDATION | candidate stays inside catalog | 0 grounding mismatches | PASS | - |
| REC-002 | RECOMMENDATION | same work duplicate 0 | API contract test passed | PASS | - |
| AI-001 | AI | live Gemini grounded output | no live key | BLOCKED | - |
| API-001 | API | repeatable preview | p50 2.7ms / p95 6.1ms | PASS | - |
| UI-001 | UI | responsive screenshot verification | Playwright unavailable | BLOCKED | - |
| E2E-001 | E2E | session trace saved | preview-only path | FAIL | HIGH |
| SEC-001 | SECURITY | two-session isolation | no runtime session creation | BLOCKED | CRITICAL |

Executable tests: 6. Passed: 3. Failed: 3. Blocked: 3. Pass rate: 50.0%. Blocked tests are not counted as passes.
