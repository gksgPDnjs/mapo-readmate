function TraitResultScreen({ onNext }) {
  return (
    <div className="screen">
      <h2>독서 성향 결과</h2>
      <p>성향 이름 / 설명 / 추천 키워드 (준비 중)</p>
      <button onClick={onNext}>다음</button>
    </div>
  )
}

export default TraitResultScreen
