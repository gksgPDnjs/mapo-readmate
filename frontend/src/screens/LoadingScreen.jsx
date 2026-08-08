function LoadingScreen({ onNext }) {
  return (
    <div className="screen">
      <p>당신의 독서 성향을 분석하고 있습니다…</p>
      <button onClick={onNext}>다음</button>
    </div>
  )
}

export default LoadingScreen
