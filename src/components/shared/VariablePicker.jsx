import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export default function VariablePicker({ metadata, value, onChange, label = 'Variable' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('_all')
  const ref = useRef(null)

  // Close on click outside
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Build category → variables map from metadata
  const { categories, variableList } = useMemo(() => {
    if (!metadata?.variables) return { categories: [], variableList: [] }

    const catMap = {}
    const allVars = []

    for (const [varName, info] of Object.entries(metadata.variables)) {
      const cat = info.category || 'Other'
      if (!catMap[cat]) catMap[cat] = []
      const entry = { name: varName, label: info.label || varName, category: cat }
      catMap[cat].push(entry)
      allVars.push(entry)
    }

    // Sort categories, put "Other" and system categories at end
    const sortedCats = Object.keys(catMap).sort((a, b) => {
      const aIsSystem = ['Other', 'Socio-Economic Background', 'Interview Record'].includes(a)
      const bIsSystem = ['Other', 'Socio-Economic Background', 'Interview Record'].includes(b)
      if (aIsSystem !== bIsSystem) return aIsSystem ? 1 : -1
      return a.localeCompare(b)
    })

    return { categories: sortedCats, variableList: allVars }
  }, [metadata])

  // Filter by category and search
  const filtered = useMemo(() => {
    let vars = variableList
    if (selectedCategory !== '_all') {
      vars = vars.filter(v => v.category === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      vars = vars.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q)
      )
    }
    return vars
  }, [variableList, selectedCategory, search])

  const selectedVar = metadata?.variables?.[value]
  const displayText = selectedVar
    ? `${value} — ${selectedVar.label || ''}`
    : 'Select a variable…'

  return (
    <div className="picker-wrap" ref={ref}>
      <label className="picker-label">{label}</label>

      {/* Trigger button */}
      <button className="picker-trigger" onClick={() => setOpen(!open)}>
        <span className="picker-trigger-text">{displayText}</span>
        <ChevronDown size={15} className={`picker-chevron${open ? ' open' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="picker-dropdown">
          {/* Search */}
          <div className="picker-search-wrap">
            <Search size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              className="picker-search"
              placeholder="Search variables…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category filter */}
          <div className="picker-categories">
            <button
              className={`picker-cat-btn${selectedCategory === '_all' ? ' active' : ''}`}
              onClick={() => setSelectedCategory('_all')}
            >
              All ({variableList.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`picker-cat-btn${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Variable list */}
          <div className="picker-list">
            {filtered.length === 0 && (
              <div className="picker-empty">No variables match your search.</div>
            )}
            {filtered.map(v => (
              <button
                key={v.name}
                className={`picker-option${v.name === value ? ' active' : ''}`}
                onClick={() => { onChange(v.name); setOpen(false); setSearch('') }}
              >
                <span className="picker-option-name">{v.name}</span>
                <span className="picker-option-label">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
