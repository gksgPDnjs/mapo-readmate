# Question Mapping Matrix

| Runtime source | 질문 | Option count | DB mapping | Status |
| --- | --- | --- | --- | --- |
| DeepQuizScreen -> GET /api/deep-questions | genres | 5 | 어떤 장르의 책이 가장 끌리나요? 여러 개를 골라도 좋아요. | PASS |
| DeepQuizScreen -> GET /api/deep-questions | domains | 3 | 읽으며 만나고 싶은 주제는 무엇인가요? 여러 개를 골라도 좋아요. | PASS |
| DeepQuizScreen -> GET /api/deep-questions | moods | 4 | 지금 읽고 싶은 책의 분위기를 골라주세요. | PASS |
| DeepQuizScreen -> GET /api/deep-questions | style | 3 | 어떤 문체가 편하게 느껴지나요? | PASS |
| DeepQuizScreen -> GET /api/deep-questions | ending | 3 | 이야기의 마무리는 어떤 쪽이 좋나요? | PASS |
| DeepQuizScreen -> GET /api/deep-questions | visual | 3 | 어떤 책의 형태가 읽기 편한가요? | PASS |
| DeepQuizScreen -> GET /api/deep-questions | utility | 3 | 책을 읽고 가장 얻고 싶은 것은 무엇인가요? | PASS |
| DeepQuizScreen -> GET /api/deep-questions | avoid | 4 | 이번 추천에서 피하고 싶은 요소를 골라주세요. 여러 개를 골라도 좋아요. | PASS |
| ChatScreen -> frontend/src/data/questions.js | 12 first-stage questions | 3 | DB first-stage-v1과 클릭/응답 저장 mapping 없음 | MISSING |
| survey/survey_mbti_v2.json | 요청된 비교 소스 | - | 해당 경로 없음; DB구축/survey_mbti_v2.json만 존재 | BLOCKED |

2차 질문은 DB가 runtime source지만, 1차 질문은 static source이며 answer persistence API가 없다.
