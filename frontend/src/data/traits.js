// axes의 value는 실제 퀴즈 채점 로직이 나오기 전까지 쓰는 샘플 퍼센트입니다.
// value는 letter 쪽으로 기울어진 비율(%)이고, code는 각 축에서 50% 이상인 letter를 모은 값이에요.
export const defaultTrait = {
  code: 'AEGI',
  emoji: '🌱',
  name: '호기심 탐험가형',
  description: '새로운 이야기와 성장 서사를 좋아해요',
  keywords: ['#모험', '#성장', '#상상력'],
  axes: [
    { letter: 'A', label: '모험', opposite: '안정', value: 68 },
    { letter: 'E', label: '탐험', opposite: '익숙함', value: 74 },
    { letter: 'G', label: '성장', opposite: '위로', value: 61 },
    { letter: 'I', label: '상상', opposite: '현실', value: 55 },
  ],
}
