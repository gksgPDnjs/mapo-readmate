function ChatScreen({ onNext }) {
  return (
    <div className="screen">
      <h2>대화 화면</h2>
      <p>AI 질문 / 사용자 선택 반복 (준비 중)</p>
      <button onClick={onNext}>다음</button>
    </div>
  )
}

export default ChatScreen
