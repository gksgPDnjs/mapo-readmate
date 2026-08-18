import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import BookCover from '../components/BookCover'
import TraitHeroCard from '../components/TraitHeroCard'
import TraitAxisBar from '../components/TraitAxisBar'
import Button from '../components/Button'
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
  const [actionStatus, setActionStatus] = useState('')
  const cardRef = useRef(null)

  const captureCardImage = () => {
    if (!cardRef.current) return Promise.resolve(null)
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#f4f8f5' })
  }

  const handleSaveImage = async () => {
    setActionStatus('')
    try {
      const dataUrl = await captureCardImage()
      if (!dataUrl) return
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `readmate-${code}.png`
      link.click()
    } catch {
      setActionStatus('이미지 저장에 실패했어요. 화면 캡처로 저장해보세요.')
    }
  }

  const handleShare = async () => {
    setActionStatus('')
    try {
      const dataUrl = await captureCardImage()
      if (!dataUrl) return
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `readmate-${code}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ReadMate 독서 성향 결과' })
        return
      }
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `readmate-${code}.png`
      link.click()
      setActionStatus('이 기기에서는 공유가 지원되지 않아 대신 이미지를 저장했어요.')
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') return
      setActionStatus('공유에 실패했어요. 이미지 저장을 이용해주세요.')
    }
  }

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
      <div className="result-card" ref={cardRef}>
        <header className="result-card-brand">
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

        <p className="result-card-caption">AI 독서 성향 테스트 · ReadMate</p>
      </div>

      <div className="public-result-actions">
        <Button onClick={handleSaveImage}>🖼️ 이미지로 저장</Button>
        <Button variant="secondary" onClick={handleShare}>
          공유하기
        </Button>
        {actionStatus && <p className="public-result-action-status">{actionStatus}</p>}
      </div>
    </div>
  )
}

export default PublicResultScreen
