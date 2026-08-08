import './TraitAxisBar.css'

function TraitAxisBar({ axis }) {
  return (
    <div className="axis-bar">
      <div className="axis-bar-labels">
        <span className="axis-bar-label is-dominant">
          {axis.label} {axis.value}%
        </span>
        <span className="axis-bar-label">
          {axis.opposite} {100 - axis.value}%
        </span>
      </div>
      <div className="axis-bar-track">
        <div className="axis-bar-fill" style={{ width: `${axis.value}%` }} />
      </div>
    </div>
  )
}

export default TraitAxisBar
