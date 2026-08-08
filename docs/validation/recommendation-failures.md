# Recommendation Failures

| Code | Classification | Actual | Status |
| --- | --- | --- | --- |
| NO_CANDIDATE | Synthetic simulation | 28 / 5,000 profiles | WARNING |
| FEATURE_COVERAGE | Catalog coverage | 0 / 510 works lack approved features | PASS |
| FEATURE_DIVERSITY | Catalog specificity | 500 / 510 works have only MVP baseline features | WARNING |
| PROFILE_INSENSITIVE | First-stage to recommendation | 1차 axis score is not an API recommendation input | FAIL |
| DUPLICATE_WORK | Preview API | No duplicate detected by API contract check | PASS |
| AI_HALLUCINATION | Live Gemini | No configured live Gemini validation | BLOCKED |
