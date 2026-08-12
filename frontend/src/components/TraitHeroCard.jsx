import './TraitHeroCard.css'

function TraitHeroCard({ trait, eyebrow = '나의 독서 성향', showDescription = true, showKeywords = true }) {
  return (
    <section className="trait-hero">
      <p className="trait-hero-eyebrow">{eyebrow}</p>
      <div className="trait-hero-code">{trait.code}</div>
      <p className="trait-hero-name">
        {trait.emoji} {trait.name}
      </p>
      {showDescription && trait.description && <p className="trait-hero-desc">{trait.description}</p>}
      {showKeywords && Array.isArray(trait.keywords) && trait.keywords.length > 0 && (
        <div className="trait-hero-tags">
          {trait.keywords.map((keyword) => (
            <span key={keyword} className="trait-hero-tag">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export default TraitHeroCard
