const axisDefinitions = [
  { code: 'purpose', left: '지식 탐색', right: '이야기 몰입', leftCode: 'K', rightCode: 'S' },
  { code: 'language', left: '동양 친숙', right: '서양 탐험', leftCode: 'E', rightCode: 'W' },
  { code: 'popularity', left: '대중 선택', right: '새로운 발견', leftCode: 'M', rightCode: 'N' },
  { code: 'difficulty', left: '가볍게 읽기', right: '깊이 읽기', leftCode: 'L', rightCode: 'D' },
]

export function createTrait(answers) {
  const scores = Object.fromEntries(axisDefinitions.map((axis) => [axis.code, { total: 0, count: 0 }]))

  answers.forEach(({ axis, score }) => {
    if (scores[axis] && Number.isFinite(score)) {
      scores[axis].total += score
      scores[axis].count += 1
    }
  })

  const axes = axisDefinitions.map((definition) => {
    const { total, count } = scores[definition.code]
    const average = count ? total / count : 0
    const prefersRight = average > 0
    const rightValue = Math.round((average + 1) * 50)

    return {
      letter: prefersRight ? definition.rightCode : definition.leftCode,
      label: prefersRight ? definition.right : definition.left,
      opposite: prefersRight ? definition.left : definition.right,
      value: prefersRight ? rightValue : 100 - rightValue,
    }
  })

  const strongestAxis = [...axes].sort((left, right) => Math.abs(right.value - 50) - Math.abs(left.value - 50))[0]
  const hasStrongPreference = axes.some((axis) => axis.value !== 50)

  return {
    code: axes.map((axis) => axis.letter).join(''),
    emoji: '📚',
    name: hasStrongPreference ? `${strongestAxis.label} 독서형` : '균형 잡힌 독서형',
    description: hasStrongPreference
      ? `${axes.map((axis) => axis.label).join(', ')} 성향이 나타났어요.`
      : '어느 한쪽에 치우치지 않고 다양한 책을 즐길 수 있어요.',
    keywords: axes.map((axis) => `#${axis.label.replaceAll(' ', '')}`),
    axes,
  }
}