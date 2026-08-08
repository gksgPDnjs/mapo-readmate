import { useState } from 'react'
import Button from '../components/Button'
import TraitBadgeCard from '../components/TraitBadgeCard'
import { STEP } from '../constants'
import './ReportScreen.css'

function ReportScreen({ onGoTo, recommendations, trait }) {
  const [view, setView] = useState('result')

  if (view === 'qr') {
    return (
      <div className="screen screen-report">
        <button className="text-link back-link" onClick={() => setView('result')}>
          ← 돌아가기
        </button>
        <div className="screen-copy">
          <h2>QR로 결과를 저장해 보세요</h2>
          <p>친구에게 보여주거나 나중에 다시 확인할 수 있어요</p>
        </div>
        <div className="qr-box" aria-label="QR 코드">
          <span className="qr-finder qr-finder-tl" />
          <span className="qr-finder qr-finder-tr" />
          <span className="qr-finder qr-finder-bl" />
        </div>
        <div className="screen-actions">
          <Button>QR 저장하기</Button>
          <Button variant="secondary">결과 공유하기</Button>
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
        <p>당신의 독서 성향이에요</p>
      </div>
      <TraitBadgeCard trait={trait} />
      <ul className="report-summary-list">
        <li>
          <strong>추천 도서</strong> {recommendations.length > 0 ? recommendations.map((book) => book.title).join(', ') : '추천 후보 없음'}
        </li>
        <li>
          <strong>오늘의 독서 미션</strong> 추천받은 책의 첫 장을 읽고 가장 인상 깊었던 장면을
          가족에게 이야기해보세요.
        </li>
      </ul>
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
