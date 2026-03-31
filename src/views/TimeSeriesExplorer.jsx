import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useABSData } from '../context/DataProvider'
import CountryPicker from '../components/shared/CountryPicker'
import TimeSeriesChart from '../components/shared/TimeSeriesChart'
import ExportBar from '../components/shared/ExportBar'
import { exportPNG, exportCSV } from '../utils/exportUtils'

const DEFAULT_COUNTRIES = ['JP', 'KR', 'TW', 'TH']

const WAVE_LABELS = {
  wave1: 'Wave 1 (2001–03)',
  wave2: 'Wave 2 (2005–08)',
  wave3: 'Wave 3 (2010–12)',
  wave4: 'Wave 4 (2014–16)',
  wave5: 'Wave 5 (2018–21)',
}

export default function TimeSeriesExplorer() {
  const { timeseries, countryRegistry, getCountryName, getCountryColor } = useABSData()

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedVariable, setSelectedVariable] = useState(null)
  const [selectedCountries, setSelectedCountries] = useState(DEFAULT_COUNTRIES)
  const [mode, setMode] = useState('mean') // 'mean' or 'pct'
  const [selectedResponse, setSelectedResponse] = useState(null)
  const chartRef = useRef(null)

  // Build category → variables map from timeseries data
  const { categories, variablesByCategory } = useMemo(() => {
    if (!timeseries?.harmonized_variables) return { categories: [], variablesByCategory: {} }

    const catMap = {}
    for (const [id, info] of Object.entries(timeseries.harmonized_variables)) {
      const cat = info.category || 'Other'
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push({ id, label: info.label, category: cat })
    }

    const sorted = Object.keys(catMap).sort()
    return { categories: sorted, variablesByCategory: catMap }
  }, [timeseries])

  // Auto-select first category and variable
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  useEffect(() => {
    if (selectedCategory && variablesByCategory[selectedCategory]?.length > 0) {
      const firstVar = variablesByCategory[selectedCategory][0].id
      setSelectedVariable(firstVar)
    }
  }, [selectedCategory, variablesByCategory])

  // Current variable data
  const varData = timeseries?.harmonized_variables?.[selectedVariable]

  // Auto-select first response code when switching to pct mode or variable
  useEffect(() => {
    if (mode === 'pct' && varData?.harmonized_labels) {
      const codes = Object.keys(varData.harmonized_labels).sort((a, b) => Number(a) - Number(b))
      if (codes.length > 0 && (!selectedResponse || !codes.includes(selectedResponse))) {
        setSelectedResponse(codes[0])
      }
    }
  }, [mode, varData, selectedResponse])

  // All countries across all waves
  const allCountries = useMemo(() => {
    if (!countryRegistry?.countries) return []
    return Object.entries(countryRegistry.countries)
      .map(([code, info]) => ({ code, name: info.display_name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countryRegistry])

  // Variables in selected category
  const currentVars = variablesByCategory[selectedCategory] || []

  // Response options for pct mode
  const responseOptions = useMemo(() => {
    if (!varData?.harmonized_labels) return []
    return Object.entries(varData.harmonized_labels)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([code, label]) => ({ code, label }))
  }, [varData])

  // Export handlers
  const handleExportPNG = useCallback(() => {
    exportPNG(chartRef, `abs_timeseries_${selectedVariable || 'chart'}.png`)
  }, [selectedVariable])

  const handleExportCSV = useCallback(() => {
    if (!varData) return
    const headers = ['Country', 'Country_Code', 'Wave', 'Mean', 'Valid_N']
    if (mode === 'pct') headers.push('Response_Code', 'Response_Label', 'Percentage')
    const rows = []

    for (const cc of selectedCountries) {
      for (const wk of varData.waves_available) {
        const cd = varData.waves[wk]?.countries?.[cc]
        if (!cd || cd.valid_n === 0) continue
        const row = [getCountryName(cc), cc, wk.replace('wave', 'Wave '), cd.mean, cd.valid_n]
        if (mode === 'pct' && selectedResponse) {
          const pct = cd.responses?.[selectedResponse]?.pct
          row.push(selectedResponse, varData.harmonized_labels?.[selectedResponse] || '', pct)
        }
        rows.push(row)
      }
    }

    exportCSV(rows, headers, `abs_timeseries_${selectedVariable || 'data'}.csv`)
  }, [varData, selectedCountries, mode, selectedResponse, selectedVariable, getCountryName])

  return (
    <div className="view-page dock-clearance">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-up">
          <h1>Time-Series Explorer</h1>
          <p className="view-subtitle">
            Track harmonized variables across five waves of the Asian Barometer Survey.
          </p>
        </div>

        <div className="explorer-layout animate-fade-up stagger-1" style={{ marginTop: '1.5rem' }}>
          {/* Controls */}
          <div className="explorer-controls">
            {/* Category selector */}
            <div className="picker-wrap">
              <label className="picker-label">Category</label>
              <div className="ts-select-wrap">
                <select
                  className="ts-select"
                  value={selectedCategory || ''}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="ts-select-icon" />
              </div>
            </div>

            {/* Variable selector */}
            <div className="picker-wrap">
              <label className="picker-label">Variable</label>
              <div className="ts-select-wrap">
                <select
                  className="ts-select"
                  value={selectedVariable || ''}
                  onChange={e => setSelectedVariable(e.target.value)}
                >
                  {currentVars.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label || v.id}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="ts-select-icon" />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="picker-wrap">
              <label className="picker-label">Display</label>
              <div className="mode-toggle">
                <button
                  className={`mode-btn${mode === 'mean' ? ' active' : ''}`}
                  onClick={() => setMode('mean')}
                >
                  Mean
                </button>
                <button
                  className={`mode-btn${mode === 'pct' ? ' active' : ''}`}
                  onClick={() => setMode('pct')}
                >
                  % Response
                </button>
              </div>
            </div>

            {/* Response selector (pct mode only) */}
            {mode === 'pct' && responseOptions.length > 0 && (
              <div className="picker-wrap animate-fade-in">
                <label className="picker-label">Response Value</label>
                <div className="ts-select-wrap">
                  <select
                    className="ts-select"
                    value={selectedResponse || ''}
                    onChange={e => setSelectedResponse(e.target.value)}
                  >
                    {responseOptions.map(({ code, label }) => (
                      <option key={code} value={code}>
                        {code} = {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="ts-select-icon" />
                </div>
              </div>
            )}

            <CountryPicker
              countries={allCountries}
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />

            <ExportBar
              onExportPNG={handleExportPNG}
              onExportCSV={handleExportCSV}
              disabled={!varData}
            />

            {/* Variable details */}
            {varData && (
              <div className="detail-panel">
                <TSDetailContent varData={varData} />
              </div>
            )}
          </div>

          {/* Chart area */}
          <div className="explorer-main">
            {varData ? (
              <div ref={chartRef} className="chart-panel">
                <div className="chart-title-bar">
                  <h3 className="chart-title">{varData.label}</h3>
                  <span className="chart-wave-badge">
                    {mode === 'mean' ? 'Mean' : `% "${responseOptions.find(r => r.code === selectedResponse)?.label || selectedResponse}"`}
                  </span>
                </div>

                <TimeSeriesChart
                  variableData={varData}
                  selectedCountries={selectedCountries}
                  getCountryName={getCountryName}
                  mode={mode}
                  selectedResponse={selectedResponse}
                />
              </div>
            ) : (
              <div className="chart-empty">
                <p>Select a variable to view its time-series.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Inline detail component for time-series specifics ── */
function TSDetailContent({ varData }) {
  const [open, setOpen] = useState(false)

  return (
    <>
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
          <div className="detail-question">{varData.label}</div>

          <div className="detail-meta">
            <span className="detail-tag">{varData.category}</span>
            {varData.scale_points && <span className="detail-tag">{varData.scale_points}-point scale</span>}
            <span className="detail-tag">{varData.waves_available.length} waves</span>
          </div>

          {/* Harmonized scale */}
          {varData.harmonized_labels && Object.keys(varData.harmonized_labels).length > 0 && (
            <div className="detail-responses">
              <div className="detail-responses-label">Harmonized Response Scale</div>
              {Object.entries(varData.harmonized_labels)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([code, label]) => (
                  <div key={code} className="detail-response-row">
                    <span className="detail-response-code">{code}</span>
                    <span className="detail-response-label">{label}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Per-wave source variables */}
          <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
            <div className="detail-responses-label">Source Variables by Wave</div>
            {varData.waves_available.map(wk => {
              const wd = varData.waves[wk]
              if (!wd) return null
              return (
                <div key={wk} className="detail-response-row">
                  <span className="detail-response-code" style={{ minWidth: 50 }}>
                    {WAVE_LABELS[wk]?.split(' (')[0] || wk}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    {wd.source_variable}
                  </span>
                  {wd.recode_applied !== 'none' && (
                    <span className="detail-nr-badge">{wd.recode_applied}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Notes */}
          {varData.notes && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
              {varData.notes}
            </div>
          )}
        </div>
      )}
    </>
  )
}
