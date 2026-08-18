import { useEffect, useState } from 'react'
import Button from '../components/Button'
import { STEP } from '../constants'
import './DeepQuizScreen.css'

function DeepQuizScreen({ onDeepComplete, onGoTo, firstStagePreferredFeatureCodes = [], sessionId }) {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const loadQuestions = async () => {
    setStatus('loading')
    setError('')
    try {
      const response = await fetch('/api/deep-questions')
      if (!response.ok) {
        throw new Error('도서 데이터 연결이 아직 준비되지 않았어요.')
      }
      const payload = await response.json()
      if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
        throw new Error('2차 문항을 찾을 수 없어요.')
      }
      setQuestions(payload.questions)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '2차 문항을 불러오지 못했어요.')
      setStatus('error')
    }
  }

  useEffect(() => {
    void loadQuestions()
  }, [])

  const question = questions[step]
  const selectedCodes = question ? answers[question.code] ?? [] : []
  const canContinue = question?.code === 'avoid' || selectedCodes.length > 0

  const toggleOption = (optionCode) => {
    setAnswers((currentAnswers) => {
      const currentSelection = currentAnswers[question.code] ?? []
      const nextSelection = question.questionType === 'multi_select'
        ? currentSelection.includes(optionCode)
          ? currentSelection.filter((code) => code !== optionCode)
          : [...currentSelection, optionCode]
        : [optionCode]
      return { ...currentAnswers, [question.code]: nextSelection }
    })
  }

  const submit = async () => {
    const selectedOptions = questions.flatMap((currentQuestion) =>
      currentQuestion.options.filter((option) => (answers[currentQuestion.code] ?? []).includes(option.code)),
    )
    const avoidedFeatureCodes = [...new Set(selectedOptions
      .filter((option) => option.value.preference === 'avoid')
      .map((option) => option.value.featureCode))]
    // 1차 성향(동양/서양, 유명세/신인, 난이도 등)을 2차 정밀 조건과 합쳐서 보낸다.
    // 2차에서 명시적으로 피한 항목이 1차 성향과 겹치면 회피가 우선한다.
    const deepPreferredFeatureCodes = selectedOptions
      .filter((option) => option.value.preference === 'prefer')
      .map((option) => option.value.featureCode)
    const preferredFeatureCodes = [...new Set([...firstStagePreferredFeatureCodes, ...deepPreferredFeatureCodes])]
      .filter((code) => !avoidedFeatureCodes.includes(code))

    setStatus('submitting')
    setError('')
    try {
      // 1차+2차를 합친 최종 조건으로 여기서 딱 한 번 추천을 확정 저장한다.
      // 이 결과가 화면에도 뜨고, QR로 저장되는 결과와도 항상 같은 값이다.
      const response = await fetch(`/api/sessions/${sessionId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredFeatureCodes, avoidedFeatureCodes, limit: 3 }),
      })
      if (!response.ok) {
        throw new Error('추천 데이터를 준비하지 못했어요.')
      }
      const payload = await response.json()
      onDeepComplete(Array.isArray(payload.recommendations) ? payload.recommendations : [], payload.publicCode)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '추천 데이터를 준비하지 못했어요.')
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return <main className="screen deep-quiz-status">2차 추천 조건을 준비하고 있어요.</main>
  }

  if (status === 'error') {
    return (
      <main className="screen deep-quiz-status">
        <div className="screen-copy">
          <h2>2차 추천 조건을 열 수 없어요</h2>
          <p>{error}</p>
        </div>
        <div className="screen-actions">
          <Button onClick={loadQuestions}>다시 시도</Button>
          <Button variant="secondary" onClick={() => onGoTo(STEP.TRAIT)}>성향 결과로 돌아가기</Button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen deep-quiz">
      <div className="deep-quiz-progress">정밀 추천 {step + 1} / {questions.length}</div>
      <div className="screen-copy deep-quiz-copy">
        <h2>{question.prompt}</h2>
        <p>{question.questionType === 'multi_select' ? '여러 개를 골라주세요.' : '하나를 골라주세요.'}</p>
      </div>
      <div className="deep-quiz-options">
        {question.options.map((option) => {
          const selected = selectedCodes.includes(option.code)
          return (
            <button
              className={`deep-quiz-option ${selected ? 'is-selected' : ''}`}
              key={option.code}
              onClick={() => toggleOption(option.code)}
              type="button"
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <div className="screen-actions">
        {step > 0 && <Button variant="secondary" onClick={() => setStep((currentStep) => currentStep - 1)}>이전</Button>}
        <Button disabled={!canContinue || status === 'submitting'} onClick={() => step === questions.length - 1 ? submit() : setStep((currentStep) => currentStep + 1)}>
          {step === questions.length - 1 ? '추천 받기' : '다음'}
        </Button>
      </div>
    </main>
  )
}

export default DeepQuizScreen