import { useState } from 'react'
import Button from '../components/Button'
import TraitHeroCard from '../components/TraitHeroCard'
import TraitAxisBar from '../components/TraitAxisBar'
import BookCover from '../components/BookCover'
import QrCode from '../components/QrCode'
import { STEP } from '../constants'
import './ReportScreen.css'

function ReportScreen({ onGoTo, recommendations, trait, publicCode }) {
  const [view, setView] = useState('result')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [shareStatus, setShareStatus] = useState('')

  const resultUrl = publicCode
    ? `${window.location.origin}${window.location.pathname}#r/${publicCode}`
    : ''

  const handleSaveQr = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `readmate-${publicCode || 'result'}.png`
    link.click()
  }

  const handleShare = async () => {
    if (!resultUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ReadMate 독서 성향 결과', text: `${trait.name} 결과를 확인해보세요`, url: resultUrl })
      } catch {
        // 사용자가 공유를 취소한 경우 조용히 무시
      }
      return
    }
    try {
      await navigator.clipboard.writeText(resultUrl)
      setShareStatus('링크를 복사했어요!')
    } catch {
      setShareStatus(resultUrl)
    }
  }

  if (view === 'qr') {
    return (
      <div className="screen screen-report">
        <button className="text-link back-link" onClick={() => setView('result')}>
          ← 돌아가기
        </button>
        <div className="screen-copy">
          <h2>QR로 결과를 저장해 보세요</h2>
          <p>휴대폰으로 스캔하면 이 페이지에서 결과를 다시 볼 수 있어요</p>
        </div>
        {resultUrl ? (
          <div className="qr-box" aria-label="QR 코드">
            <QrCode value={resultUrl} size={140} onRender={setQrDataUrl} />
          </div>
        ) : (
          <p className="qr-error">결과 코드를 찾지 못했어요. 처음부터 다시 시도해주세요.</p>
        )}
        <div className="screen-actions">
          <Button disabled={!qrDataUrl} onClick={handleSaveQr}>QR 저장하기</Button>
          <Button variant="secondary" disabled={!resultUrl} onClick={handleShare}>결과 공유하기</Button>
          {shareStatus && <p className="qr-share-status">{shareStatus}</p>}
        </div>
        <button className="text-link" onClick={() => onGoTo(STEP.START)}>
          처음으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="screen screen-report">
      <div className="screen-copy">
        <h2>AI 독서 리포트가 완성되었습니다</h2>
      </div>

      <TraitHeroCard trait={trait} eyebrow="AI 독서 리포트" />

      {Array.isArray(trait.axes) && trait.axes.length > 0 && (
        <div className="report-card">
          <h3>성향 분석</h3>
          {trait.axes.map((axis) => (
            <TraitAxisBar key={axis.code} axis={axis} />
          ))}
        </div>
      )}

      <div className="report-card">
        <h3>추천 도서 {recommendations.length}권</h3>
        {recommendations.length > 0 ? (
          <ul className="report-book-list">
            {recommendations.map((book) => (
              <li key={book.title} className="report-book-item">
                <BookCover title={book.title} className="report-book-cover" />
                <span>{book.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="report-empty">추천 후보를 찾지 못했어요.</p>
        )}
      </div>

      <div className="report-card report-mission">
        <h3>🌱 오늘의 독서 미션</h3>
        <p>추천받은 책의 첫 장을 읽고 가장 인상 깊었던 장면을 가족에게 이야기해보세요.</p>
      </div>

      <div className="screen-actions">
        <Button onClick={() => setView('qr')}>QR 보러가기</Button>
      </div>
      <button className="text-link" onClick={() => onGoTo(STEP.START)}>
        처음으로 돌아가기
      </button>
    </div>
  )
}

export default ReportScreen
