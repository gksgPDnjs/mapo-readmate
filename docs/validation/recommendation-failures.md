# Recommendation Failures

| Code | Classification | Actual | Status |
| --- | --- | --- | --- |
| NO_CANDIDATE | Synthetic simulation | 28 / 5,000 profiles | WARNING |
| FEATURE_GAP | Catalog coverage | 500 / 510 works lack approved features | FAIL |
| PROFILE_INSENSITIVE | First-stage to recommendation | 1차 axis score is not an API recommendation input | FAIL |
| DUPLICATE_WORK | Preview API | No duplicate detected by API contract check | PASS |
| AI_HALLUCINATION | Live Gemini | No configured live Gemini validation | BLOCKED |
