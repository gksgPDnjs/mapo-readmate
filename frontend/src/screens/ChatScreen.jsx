import { useState } from 'react'
import ChatBubble from '../components/ChatBubble'
import Button from '../components/Button'
import { questions } from '../data/questions'
import './ChatScreen.css'

function ChatScreen({ onNext }) {
  const [step, setStep] = useState(0)
  const [history, setHistory] = useState([{ from: 'ai', text: questions[0].text }])

  const isDone = step >= questions.length

  const handleSelect = (option) => {
    const nextStep = step + 1
    const newHistory = [...history, { from: 'user', text: option.label }]

    if (nextStep < questions.length) {
      newHistory.push({ from: 'ai', text: questions[nextStep].text })
    }

    setHistory(newHistory)
    setStep(nextStep)

    if (nextStep >= questions.length) {
      setTimeout(onNext, 600)
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
