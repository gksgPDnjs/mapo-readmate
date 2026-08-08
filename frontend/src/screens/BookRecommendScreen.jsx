import { useState } from 'react'
import Button from '../components/Button'
import BookCover from '../components/BookCover'
import { recommendedBooks } from '../data/books'
import './BookRecommendScreen.css'

function BookRecommendScreen({ onNext }) {
  const [index, setIndex] = useState(0)
  const [view, setView] = useState('book')
  const book = recommendedBooks[index]
  const isLast = index === recommendedBooks.length - 1

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
        <p className="book-reason-full">{book.reason}</p>
        <div className="screen-actions">
          <Button onClick={() => setView('book')}>목록으로</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen-books">
      <div className="screen-copy">
        <h2>당신에게 맞는 추천 도서 3권</h2>
        <p>
          {index + 1} / {recommendedBooks.length} · 이 책은 당신의 성향과 잘 맞아요
        </p>
      </div>
      <BookCover title={book.title} className="book-cover" />
      <div className="book-info">
        <h3>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <p>{book.summary}</p>
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
