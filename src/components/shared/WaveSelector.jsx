const WAVES = [
  { num: 1, label: 'Wave 1', years: '2001–03' },
  { num: 2, label: 'Wave 2', years: '2005–08' },
  { num: 3, label: 'Wave 3', years: '2010–12' },
  { num: 4, label: 'Wave 4', years: '2014–16' },
  { num: 5, label: 'Wave 5', years: '2018–21' },
]

export default function WaveSelector({ value, onChange }) {
  return (
    <div className="wave-selector">
      {WAVES.map(({ num, label, years }) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className={`wave-pill${value === num ? ' active' : ''}`}
        >
          <span className="wave-pill-label">{label}</span>
          <span className="wave-pill-years">{years}</span>
        </button>
      ))}
    </div>
  )
}
