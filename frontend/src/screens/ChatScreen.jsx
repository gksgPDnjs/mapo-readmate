import { useEffect, useState } from 'react'
import ChatBubble from '../components/ChatBubble'
import Button from '../components/Button'
import './ChatScreen.css'

function ChatScreen({ onAnswer, onFirstStageComplete }) {
  const [questions, setQuestions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [step, setStep] = useState(0)
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const loadQuiz = async () => {
    setStatus('loading')
    setError('')
    try {
      const [quizResponse, sessionResponse] = await Promise.all([
        fetch('/api/quiz/active'),
        fetch('/api/sessions', { method: 'POST' }),
      ])
      if (!quizResponse.ok || !sessionResponse.ok) {
        throw new Error('독서 성향 질문을 준비하지 못했어요.')
      }
      const [quiz, session] = await Promise.all([quizResponse.json(), sessionResponse.json()])
      if (!Array.isArray(quiz.questions) || quiz.questions.length !== 12 || !session.id) {
        throw new Error('활성 질문을 찾을 수 없어요.')
      }
      setQuestions(quiz.questions)
      setSessionId(session.id)
      setHistory([{ from: 'ai', text: quiz.questions[0].prompt }])
      setStep(0)
      setStatus('ready')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '질문을 불러오지 못했어요.')
      setStatus('error')
    }
  }

  useEffect(() => {
    void loadQuiz()
  }, [])

  const isDone = step >= questions.length

  const handleSelect = async (option) => {
    if (status !== 'ready') return
    setStatus('saving')
    setError('')
    try {
      const response = await fetch(`/api/sessions/${sessionId}/responses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: questions[step].id, optionId: option.id }),
      })
      if (!response.ok) throw new Error('답변을 저장하지 못했어요.')
    const nextStep = step + 1
    const newHistory = [...history, { from: 'user', text: option.label }]
      onAnswer({ axis: questions[step].dimensionCode, score: option.score })

    if (nextStep < questions.length) {
        newHistory.push({ from: 'ai', text: questions[nextStep].prompt })
    }

    setHistory(newHistory)
    setStep(nextStep)

    if (nextStep >= questions.length) {
        const completeResponse = await fetch(`/api/sessions/${sessionId}/complete`, { method: 'POST' })
        if (!completeResponse.ok) throw new Error('성향 분석을 완료하지 못했어요.')
        const result = await completeResponse.json()
        setTimeout(() => onFirstStageComplete(result), 600)
        return
      }
      setStatus('ready')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '답변을 저장하지 못했어요.')
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return <main className="screen screen-chat chat-status">질문을 준비하고 있어요.</main>
  }

  if (status === 'error' && questions.length === 0) {
    return (
      <main className="screen screen-chat chat-status">
        <p>{error}</p>
        <Button onClick={loadQuiz}>다시 시도</Button>
      </main>
    )
  }

  return (
    <div className="screen screen-chat">
      <div className="chat-progress">
        질문 {Math.min(step + 1, questions.length)} / {questions.length}
      </div>
      <div className="chat-log">
        {history.map((message, i) => (
          <ChatBubble key={i} from={message.from}>
            {message.text}
          </ChatBubble>
        ))}
      </div>
      {!isDone && (
        <div className="chat-options">
          {questions[step].options.map((option) => (
              <Button key={option.id} variant="secondary" disabled={status === 'saving'} onClick={() => handleSelect(option)}>
              {option.label}
            </Button>
          ))}
        </div>
      )}
        {error && <p className="chat-error">{error}</p>}
    </div>
  )
}

export default ChatScreen
