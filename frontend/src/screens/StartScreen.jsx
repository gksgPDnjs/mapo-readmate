import Button from '../components/Button'
import './StartScreen.css'

function StartScreen({ onNext }) {
  return (
    <div className="screen">
      <div className="book-stack" aria-hidden="true">
        <span className="stack-book stack-book-1" />
        <span className="stack-book stack-book-2" />
        <span className="stack-book stack-book-3" />
      </div>
      <div className="screen-copy">
        <h1>나에게 맞는 책을 AI가 찾아드려요</h1>
        <p>2분 대화로 독서 취향을 알아보세요</p>
      </div>
      <div className="screen-actions">
        <Button onClick={onNext}>시작하기</Button>
        <Button
          variant="secondary"
          onClick={() =>
            alert(
              'AI와 5개의 질문에 답하면 독서 성향과 맞춤 도서 3권을 추천해드려요. 약 2~3분 정도 걸려요!'
            )
          }
        >
          체험 안내
        </Button>
      </div>
    </div>
  )
}

export default StartScreen
