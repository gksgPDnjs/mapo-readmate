function StartScreen({ onNext }) {
  return (
    <div className="screen">
      <h1>ReadMate</h1>
      <p>AI와 대화하며 찾는 나만의 독서 성향</p>
      <button onClick={onNext}>대화 시작하기</button>
    </div>
  )
}

export default StartScreen
