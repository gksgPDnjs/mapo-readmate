import './TraitFlipCard.css'

function TraitFlipCard({ trait, flipped, onFlip }) {
  return (
    <button
      type="button"
      className={`flip-card ${flipped ? 'is-flipped' : ''}`}
      onClick={onFlip}
      aria-label="카드를 눌러 독서 성향 확인하기"
    >
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-front">
          <span className="flip-card-icon">📖</span>
          <p>탭해서
            <br />
            성향 확인하기
          </p>
        </div>
        <div className="flip-card-face flip-card-back">
          <span className="flip-card-code">{trait.code}</span>
          <p className="flip-card-name">
            {trait.emoji} {trait.name}
          </p>
        </div>
      </div>
    </button>
  )
}

export default TraitFlipCard
