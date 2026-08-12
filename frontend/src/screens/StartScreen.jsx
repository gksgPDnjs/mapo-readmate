import { useState } from 'react'
import Button from '../components/Button'
import './StartScreen.css'

const GUIDE_STEPS = [
  { emoji: '💬', title: '질문에 답하기', desc: '선택지를 골라요' },
  { emoji: '🃏', title: '성향 확인하기', desc: '카드를 뒤집어요' },
  { emoji: '📚', title: '추천 도서 보기', desc: '책 3권을 봐요' },
  { emoji: '📱', title: 'QR로 저장하기', desc: '결과를 저장해요' },
]

function StartScreen({ onNext, onOpenSetup }) {
  const [view, setView] = useState('start')

  if (view === 'guide') {
    return (
      <div className="screen">
        <button className="text-link back-link" onClick={() => setView('start')}>
          ← 돌아가기
        </button>
        <div className="signboard">
          <span className="signboard-pin" aria-hidden="true" />
          <div className="screen-copy">
            <h2>🎪 체험 부스 안내</h2>
            <p>대화만 하면 나에게 맞는 책 3권을 추천해드려요</p>
          </div>
          <ol className="guide-steps">
            {GUIDE_STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="guide-step-num">{i + 1}</span>
                <span className="guide-step-emoji" aria-hidden="true">
                  {step.emoji}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="guide-time">⏱️ 2~3분이면 충분해요</p>
        </div>
        <div className="screen-actions">
          <Button onClick={onNext}>시작하기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen-start">
      <div className="logo-block">
        <div className="book-stack" aria-hidden="true">
          <span className="stack-sparkle sparkle-1">✨</span>
          <span className="stack-sparkle sparkle-2">🌱</span>
          <span className="stack-book stack-book-1" />
          <span className="stack-book stack-book-2" />
          <span className="stack-book stack-book-3" />
          <span className="stack-floor" />
        </div>
        <div className="brand">
          <span aria-hidden="true">📖</span> ReadMate
        </div>
      </div>
      <div className="screen-copy">
        <p className="start-eyebrow">🌱 AI 독서 성향 테스트</p>
        <h1>
          나에게 맞는 책,<br />
          <span className="start-highlight">AI</span>가 찾아드려요
        </h1>
        <p>2분 대화로 독서 취향을 알아보세요</p>
      </div>
      <div className="screen-actions">
        <Button onClick={onNext}>시작하기</Button>
        <Button variant="secondary" onClick={() => setView('guide')}>
          체험 안내
        </Button>
        {import.meta.env.DEV && (
          <button className="text-link" onClick={onOpenSetup}>
            도서 데이터 설정
          </button>
        )}
      </div>
    </div>
  )
}

export default StartScreen
