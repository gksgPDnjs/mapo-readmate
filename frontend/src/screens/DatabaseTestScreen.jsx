import { useEffect, useState } from 'react'
import Button from '../components/Button'
import './DatabaseTestScreen.css'

const previewRequest = {
  preferredFeatureCodes: ['G_NOVEL', 'M_CALM', 'DIFF_MEDIUM', 'TONE_POETIC', 'VIS_TEXT', 'UTIL_EMPATHY'],
  avoidedFeatureCodes: [],
  limit: 3,
}

function statusLabel(status) {
  if (status === 'ready') return '정상'
  if (status === 'error') return '확인 필요'
  return '확인 중'
}

function DatabaseTestScreen({ onClose }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const runChecks = async () => {
    setStatus('loading')
    setError('')
    try {
      const [healthResponse, diagnosticsResponse, questionsResponse, recommendationsResponse] = await Promise.all([
        fetch('/health'),
        fetch('/api/catalog/diagnostics'),
        fetch('/api/deep-questions'),
        fetch('/api/recommendations/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewRequest),
        }),
      ])
      if (![healthResponse, diagnosticsResponse, questionsResponse, recommendationsResponse].every((response) => response.ok)) {
        throw new Error('API 또는 DB 연결을 확인할 수 없어요. API 서버를 다시 시작한 뒤 재시도해 주세요.')
      }
      const [health, diagnostics, questions, recommendations] = await Promise.all([
        healthResponse.json(),
        diagnosticsResponse.json(),
        questionsResponse.json(),
        recommendationsResponse.json(),
      ])
      setResult({ health, diagnostics, questions, recommendations })
      setStatus('ready')
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : '테스트 실행에 실패했어요.')
      setStatus('error')
    }
  }

  useEffect(() => {
    void runChecks()
  }, [])

  const diagnostics = result?.diagnostics
  const recommendationBooks = result?.recommendations?.recommendations ?? []

  return (
    <main className="database-test screen">
      <header className="database-test-header">
        <span className="database-test-kicker">운영자 도구</span>
        <h1>DB 연결 테스트</h1>
        <p>실제 API 응답으로 카탈로그, 특성, 문항, 추천 도서를 확인합니다.</p>
      </header>

      <div className={`test-state is-${status}`}>
        <strong>{statusLabel(status)}</strong>
        <span>{status === 'ready' ? `${diagnostics.checkedAt} 기준` : error || 'API 응답을 기다리고 있어요.'}</span>
      </div>

      {status === 'ready' && (
        <>
          <section className="test-metrics" aria-label="카탈로그 현황">
            <article><span>공개 도서</span><strong>{diagnostics.catalog.publishedWorks} / {diagnostics.catalog.works}</strong></article>
            <article><span>공개 판본</span><strong>{diagnostics.catalog.publishedEditions} / {diagnostics.catalog.editions}</strong></article>
            <article><span>승인 특성</span><strong>{diagnostics.features.approvedValues}</strong></article>
            <article><span>2차 문항</span><strong>{result.questions.questions.length}</strong></article>
          </section>

          <section className="test-section" aria-label="데이터 출처">
            <h2>데이터 출처</h2>
            <div className="test-source-list">
              {diagnostics.sources.map((source) => (
                <div className="test-source" key={source.code}>
                  <span>{source.name}</span>
                  <strong>{source.recordCount}건</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="test-section" aria-label="추천 API 결과">
            <h2>추천 API 결과</h2>
            <p className="test-hint">고정된 시연 조건으로 조회한 DB 추천 도서입니다.</p>
            <div className="test-book-list">
              {recommendationBooks.map((book) => (
                <article className="test-book" key={book.workId}>
                  <h3>{book.title}</h3>
                  <p>{book.author || '저자 정보 없음'}</p>
                  <p>{book.description || '소개 정보 없음'}</p>
                  <small>일치 특성 {book.matchedFeatureCodes.length}개 · 점수 {book.score}</small>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="screen-actions">
        <Button variant="secondary" onClick={onClose}>설정으로 돌아가기</Button>
        <Button disabled={status === 'loading'} onClick={runChecks}>다시 검사</Button>
      </div>
    </main>
  )
}

export default DatabaseTestScreen
