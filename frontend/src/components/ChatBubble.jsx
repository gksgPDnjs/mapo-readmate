import './ChatBubble.css'

function ChatBubble({ from = 'ai', children }) {
  return (
    <div className={`bubble-row bubble-row-${from}`}>
      {from === 'ai' && (
        <div className="bubble-avatar" aria-hidden="true">
          📖
        </div>
      )}
      <div className={`bubble bubble-${from}`}>{children}</div>
    </div>
  )
}

export default ChatBubble
