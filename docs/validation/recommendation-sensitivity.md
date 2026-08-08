# Recommendation Sensitivity

| Persona | Feature input | Top 3 |
| --- | --- | --- |
| Base novel/calm | G_NOVEL, M_CALM | 긴긴밤 / 아몬드 / 지구 끝의 온실 |
| Healing | G_NOVEL, M_HEALING | 불편한 편의점 / 긴긴밤 / 나미야 잡화점의 기적 |
| Science/deep | D_SCIENCE, DIFF_DEEP | 지구 끝의 온실 / 팩트풀니스 |
| Practical | G_SELF_DEV, UTIL_PRACTICAL | 아주 작은 습관의 힘 |

1차의 purpose, language, popularity, difficulty 축은 현재 recommendation preview API 입력으로 변환되지 않는다. 따라서 해당 네 축을 바꾼 sensitivity test는 **FAIL: recommendation path 미연결**이다. 이 문서의 feature persona 결과는 2차 DB 특성 입력에 한정한다.
