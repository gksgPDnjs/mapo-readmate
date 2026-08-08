import { useState } from 'react'
import Button from '../components/Button'
import BookCover from '../components/BookCover'
import { STEP } from '../constants'
import './BookRecommendScreen.css'

function BookRecommendScreen({ onNext, onGoTo, recommendations }) {
  const [index, setIndex] = useState(0)
  const [view, setView] = useState('book')
  const book = recommendations[index]
  const isLast = index === recommendations.length - 1

  if (recommendations.length === 0) {
    return (
      <div className="screen screen-books">
        <div className="screen-copy">
          <h2>추천할 도서를 찾지 못했어요</h2>
          <p>공개되고 특성이 검수된 도서가 더 필요합니다.</p>
        </div>
        <div className="screen-actions">
          <Button onClick={() => onGoTo(STEP.DEEP)}>조건 다시 고르기</Button>
        </div>
      </div>
    )
  }

  const handleNextBook = () => {
    if (isLast) {
      onNext()
      return
    }
    setIndex((i) => i + 1)
    setView('book')
  }

  if (view === 'reason') {
    return (
      <div className="screen screen-books">
        <button className="text-link back-link" onClick={() => setView('book')}>
          ← 돌아가기
        </button>
        <div className="screen-copy">
          <h2>{book.title}을(를) 추천한 이유</h2>
        </div>
        <BookCover title={book.title} className="book-cover" />
          <p className="book-reason-full">{book.explanation}</p>
        <div className="screen-actions">
          <Button onClick={() => setView('book')}>목록으로</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen-books">
      <div className="screen-copy">
          <h2>당신에게 맞는 추천 도서 {recommendations.length}권</h2>
        <p>
          {index + 1} / {recommendations.length} · 선택한 조건과 잘 맞아요
        </p>
      </div>
      <BookCover title={book.title} className="book-cover" />
      <div className="book-info">
        <h3>{book.title}</h3>
        <p className="book-author">{book.author ?? '저자 정보 준비 중'}</p>
        <p>{book.description ?? '도서 소개는 검수 후 제공됩니다.'}</p>
      </div>
      <div className="screen-actions">
        <Button variant="secondary" onClick={() => setView('reason')}>
          추천 이유 보기
        </Button>
        <Button onClick={handleNextBook}>{isLast ? '독서 리포트 보기' : '다음 책 보기'}</Button>
      </div>
    </div>
  )
}

export default BookRecommendScreen
