function BookRecommendScreen({ onNext }) {
  return (
    <div className="screen">
      <h2>추천 도서</h2>
      <p>추천 도서 3권 + 추천 이유 (준비 중)</p>
      <button onClick={onNext}>다음</button>
    </div>
  )
}

export default BookRecommendScreen
