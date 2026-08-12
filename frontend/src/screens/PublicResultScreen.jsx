import { useEffect, useState } from 'react'
import BookCover from '../components/BookCover'
import TraitHeroCard from '../components/TraitHeroCard'
import TraitAxisBar from '../components/TraitAxisBar'
import './PublicResultScreen.css'

const ROLE_LABELS = {
  read_now: '지금 바로 읽기',
  stretch: '한 단계 확장',
  discovery: '뜻밖의 발견',
}

function PublicResultScreen({ code }) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')
    fetch(`/api/results/${code}`)
      .then((response) => {
        if (!response.ok) throw new Error('결과를 찾을 수 없어요.')
        return response.json()
      })
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        setStatus('ready')
      })
      .catch((fetchError) => {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : '결과를 불러오지 못했어요.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  if (status === 'loading') {
    return (
      <main className="public-result public-result-status">
        <div className="public-result-status-inner">
          <span className="public-result-spinner" aria-hidden="true" />
          <p>결과를 불러오고 있어요</p>
        </div>
      </main>
    )
  }

  if (status === 'error' || !data) {
    return (
      <main className="public-result public-result-status">
        <div className="public-result-status-inner">
          <p>{error || '결과를 찾을 수 없어요.'}</p>
          <a className="public-result-cta" href="/">
            ReadMate 시작하기
          </a>
        </div>
      </main>
    )
  }

  const trait = { emoji: '📚', ...data.trait }

  return (
    <div className="public-result">
      <header className="public-result-brand">
        <span aria-hidden="true">📖</span> ReadMate
      </header>

      <TraitHeroCard trait={trait} />

      {Array.isArray(trait.axes) && trait.axes.length > 0 && (
        <section className="public-result-card">
          <h3>성향 분석</h3>
          {trait.axes.map((axis) => (
            <TraitAxisBar key={axis.code} axis={axis} />
          ))}
        </section>
      )}

      <section className="public-result-books">
        <h3>추천 도서 {data.recommendations.length}권</h3>
        <ul className="public-result-book-list">
          {data.recommendations.map((book) => (
            <li key={book.title} className="public-result-book">
              {ROLE_LABELS[book.role] && <span className="public-result-role">{ROLE_LABELS[book.role]}</span>}
              <div className="public-result-book-row">
                <BookCover title={book.title} className="public-result-cover" />
                <div className="public-result-book-info">
                  <h4>{book.title}</h4>
                  <p className="public-result-author">{book.author ?? '저자 정보 준비 중'}</p>
                  {book.description && <p className="public-result-description">{book.description}</p>}
                </div>
              </div>
              {book.explanation && <p className="public-result-explanation">“{book.explanation}”</p>}
            </li>
          ))}
        </ul>
      </section>

      <footer className="public-result-footer">
        <p>ReadMate · AI 독서 성향 테스트</p>
        <a href="/">나도 테스트 해보기 →</a>
      </footer>
    </div>
  )
}

export default PublicResultScreen
