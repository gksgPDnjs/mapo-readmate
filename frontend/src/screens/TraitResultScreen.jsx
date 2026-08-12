import { useState } from 'react'
import Button from '../components/Button'
import TraitFlipCard from '../components/TraitFlipCard'
import TraitAxisBar from '../components/TraitAxisBar'
import './TraitResultScreen.css'

function TraitResultScreen({ onNext, onRetake, trait }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="screen screen-trait">
      <div className="screen-copy">
        <h2>당신의 독서 성향 카드</h2>
        <p>{flipped ? trait.description : '카드를 눌러 결과를 확인해보세요'}</p>
      </div>
      <TraitFlipCard trait={trait} flipped={flipped} onFlip={() => setFlipped(true)} />
      {flipped && (
        <>
          <div className="keyword-tags">
            {trait.keywords.map((keyword) => (
              <span key={keyword} className="tag">
                {keyword}
              </span>
            ))}
          </div>
          <div className="axis-card">
            <h3>성향 분석</h3>
            {trait.axes.map((axis) => (
              <TraitAxisBar key={axis.code} axis={axis} />
            ))}
          </div>
          <div className="screen-actions">
            <Button onClick={onNext}>정밀 조건 더 고르기</Button>
            <Button variant="secondary" onClick={onRetake}>
              다시 분석하기
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default TraitResultScreen
