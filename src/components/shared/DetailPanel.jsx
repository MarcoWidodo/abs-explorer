import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function DetailPanel({ variableInfo }) {
  const [open, setOpen] = useState(false)

  if (!variableInfo) return null

  const { label, response_options, scale_type, scale_points, category, countries_asked } = variableInfo

  return (
    <div className="detail-panel">
      <button className="detail-toggle" onClick={() => setOpen(!open)}>
        <span className="detail-toggle-text">Variable Details</span>
        <ChevronDown
          size={15}
          style={{
            transition: 'transform 0.25s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            color: 'var(--color-text-tertiary)',
          }}
        />
      </button>

      {open && (
        <div className="detail-content animate-fade-in">
          {/* Question text */}
          <div className="detail-question">{label}</div>

          {/* Meta row */}
          <div className="detail-meta">
            {category && <span className="detail-tag">{category}</span>}
            {scale_type && <span className="detail-tag">{scale_type}</span>}
            {scale_points && <span className="detail-tag">{scale_points}-point scale</span>}
          </div>

          {/* Response options */}
          {response_options && Object.keys(response_options).length > 0 && (
            <div className="detail-responses">
              <div className="detail-responses-label">Response Options</div>
              {Object.entries(response_options)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([code, info]) => (
                  <div
                    key={code}
                    className={`detail-response-row${info.is_substantive ? '' : ' non-response'}`}
                  >
                    <span className="detail-response-code">{code}</span>
                    <span className="detail-response-label">{info.label}</span>
                    {!info.is_substantive && (
                      <span className="detail-nr-badge">Non-response</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
