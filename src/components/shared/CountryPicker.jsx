import { useMemo } from 'react'

export default function CountryPicker({ countries, selected, onChange }) {
  // countries = [{ code: 'JP', name: 'Japan' }, ...]
  const sorted = useMemo(() =>
    [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  )

  function toggle(code) {
    if (selected.includes(code)) {
      onChange(selected.filter(c => c !== code))
    } else {
      onChange([...selected, code])
    }
  }

  function selectAll() { onChange(sorted.map(c => c.code)) }
  function clearAll() { onChange([]) }

  return (
    <div className="country-picker">
      <div className="country-picker-header">
        <label className="picker-label">Countries</label>
        <div className="country-picker-actions">
          <button className="country-action-btn" onClick={selectAll}>All</button>
          <button className="country-action-btn" onClick={clearAll}>None</button>
        </div>
      </div>

      <div className="country-grid">
        {sorted.map(({ code, name }) => {
          const isSelected = selected.includes(code)
          return (
            <button
              key={code}
              className={`country-chip${isSelected ? ' active' : ''}`}
              onClick={() => toggle(code)}
              style={{
                '--chip-color': `var(--country-${code})`,
              }}
            >
              <span className="country-chip-dot" />
              <span className="country-chip-code">{code}</span>
              <span className="country-chip-name">{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
