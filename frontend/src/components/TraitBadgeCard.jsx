import './TraitBadgeCard.css'

function TraitBadgeCard({ trait }) {
  return (
    <div className="trait-result-card">
      <span className="trait-result-code">{trait.code}</span>
      <p className="trait-result-name">
        {trait.emoji} {trait.name}
      </p>
    </div>
  )
}

export default TraitBadgeCard
