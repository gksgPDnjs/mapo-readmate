import { useEffect, useRef, useState } from 'react'
import ChatBubble from '../components/ChatBubble'
import Button from '../components/Button'
import { questions } from '../data/questions'
import './ChatScreen.css'

function ChatScreen({ onNext }) {
  const [step, setStep] = useState(0)
  const [history, setHistory] = useState([{ from: 'ai', text: questions[0].text }])
  const chatEndRef = useRef(null)

  const isDone = step >= questions.length

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

  const handleSelect = (option) => {
    const nextStep = step + 1
    const newHistory = [...history, { from: 'user', text: option.label }]

    if (nextStep < questions.length) {
      newHistory.push({ from: 'ai', text: questions[nextStep].text })
    } else {
      newHistory.push({ from: 'ai', text: '고마워요! 이제 독서 성향을 분석해볼게요 🌱' })
    }

    setHistory(newHistory)
    setStep(nextStep)

    if (nextStep >= questions.length) {
      setTimeout(onNext, 1000)
    }
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
        <div ref={chatEndRef} />
      </div>
      {!isDone && (
        <div className="chat-options">
          {questions[step].options.map((option) => (
            <Button key={option.value} variant="secondary" onClick={() => handleSelect(option)}>
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatScreen
