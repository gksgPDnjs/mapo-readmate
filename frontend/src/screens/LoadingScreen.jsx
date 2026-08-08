import { useEffect } from 'react'
import Button from '../components/Button'
import './LoadingScreen.css'

function LoadingScreen({ onNext, onRestart }) {
  useEffect(() => {
    const timer = setTimeout(onNext, 2000)
    return () => clearTimeout(timer)
  }, [onNext])

  return (
    <div className="screen screen-loading">
      <div className="loading-icon" aria-hidden="true">
        📖
      </div>
      <div className="loading-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="screen-copy">
        <h2>당신의 독서 성향을 분석 중입니다</h2>
        <p>대화 내용을 바탕으로 추천을 준비하고 있어요</p>
      </div>
      <div className="screen-actions">
        <Button disabled>잠시만 기다려주세요</Button>
        <Button variant="secondary" onClick={onRestart}>
          처음으로
        </Button>
      </div>
    </div>
  )
}

export default LoadingScreen
