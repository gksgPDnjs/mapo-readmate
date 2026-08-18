import { useEffect, useState } from 'react'
import Button from '../components/Button'
import './LoadingScreen.css'

function LoadingScreen({ sessionId, onAnalysisComplete, onRestart }) {
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    setError('')
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' })
      if (!response.ok) throw new Error('성향 분석을 완료하지 못했어요.')
      const result = await response.json()
      onAnalysisComplete(result)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : '성향 분석을 완료하지 못했어요.')
    }
  }

  useEffect(() => {
    void runAnalysis()
  }, [sessionId])

  return (
    <div className="screen screen-loading">
      <div className="loading-content">
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
          <p>{error || 'AI가 대화 내용을 바탕으로 성향을 분석하고 있어요'}</p>
        </div>
      </div>
      <div className="screen-actions">
        {error ? (
          <Button onClick={runAnalysis}>다시 시도</Button>
        ) : (
          <Button disabled>잠시만 기다려주세요</Button>
        )}
        <Button variant="secondary" onClick={onRestart}>
          처음으로
        </Button>
      </div>
    </div>
  )
}

export default LoadingScreen
