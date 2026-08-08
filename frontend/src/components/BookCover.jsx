import './BookCover.css'

const PALETTE = ['#1F7A46', '#2FA360', '#3BB876', '#0E5C33']

function colorForTitle(title) {
  let hash = 0
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function BookCover({ title, className = '' }) {
  return (
    <div
      className={`book-cover-visual ${className}`}
      style={{ background: colorForTitle(title) }}
    >
      <span className="book-cover-spine" aria-hidden="true" />
      <p className="book-cover-title">{title}</p>
    </div>
  )
}

export default BookCover
