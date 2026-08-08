# Validation Test Matrix

| ID | Category | Expected | Actual | Status | Severity |
| --- | --- | --- | --- | --- | --- |
| DB-001 | DB | 510 catalog records measurable | 510 work/edition rows | PASS | - |
| DATA-001 | BOOK DATA | high metadata coverage | eligible 510/510; description missing 500/510 | FAIL | HIGH |
| REC-003 | RECOMMENDATION | catalog candidate eligibility | 510/510 works are published with approved features | PASS | - |
| QUESTION-001 | QUESTION | runtime questions from DB | 2차 PASS, 1차 static | FAIL | HIGH |
| PROFILE-001 | PROFILE | click -> DB profile trace | 0 attempts/responses/snapshots | FAIL | HIGH |
| REC-001 | RECOMMENDATION | candidate stays inside catalog | 0 grounding mismatches | PASS | - |
| REC-002 | RECOMMENDATION | same work duplicate 0 | API contract test passed | PASS | - |
| AI-001 | AI | live Gemini grounded output | no live key | BLOCKED | - |
| API-001 | API | repeatable preview | p50 10.7ms / p95 15.1ms | PASS | - |
| UI-001 | UI | responsive screenshot verification | Playwright unavailable | BLOCKED | - |
| E2E-001 | E2E | session trace saved | preview-only path | FAIL | HIGH |
| SEC-001 | SECURITY | two-session isolation | no runtime session creation | BLOCKED | CRITICAL |

Matrix rows: 12. PASS: 5. FAIL: 4. BLOCKED: 3. Blocked checks are not counted as passes.
