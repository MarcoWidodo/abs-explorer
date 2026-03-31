import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDown, ArrowUpDown } from 'lucide-react'
import { useABSData } from '../context/DataProvider'
import WaveSelector from '../components/shared/WaveSelector'
import VariablePicker from '../components/shared/VariablePicker'
import CountryPicker from '../components/shared/CountryPicker'
import ScatterPlot from '../components/shared/ScatterPlot'
import CorrelationGauge from '../components/shared/CorrelationGauge'
import DetailPanel from '../components/shared/DetailPanel'
import ExportBar from '../components/shared/ExportBar'
import { exportPNG, exportCSV } from '../utils/exportUtils'

/* ── Helpers ── */

// Look up a pair in the correlation data (try both orderings)
function lookupPair(countryCorr, varA, varB) {
  if (!countryCorr) return null
  return countryCorr[`${varA}|${varB}`] || countryCorr[`${varB}|${varA}`] || null
}

function fmtP(p) {
  if (p == null) return '—'
  if (p < 0.001) return '< 0.001'
  return p.toFixed(3)
}

function fmtR(r) {
  if (r == null) return '—'
  return r.toFixed(3)
}

/* ── Main component ── */

export default function CorrelationsExplorer() {
  const {
    loadWaveMetadata, loadWaveDistributions, loadWaveCorrelations,
    waveMetadata, waveDistributions, waveCorrelations,
    getWaveCountries, getCountryName,
  } = useABSData()

  const [wave, setWave] = useState(5)
  const [mode, setMode] = useState('ecological') // 'ecological' | 'individual'
  const [varA, setVarA] = useState(null)
  const [varB, setVarB] = useState(null)
  const [selectedCountries, setSelectedCountries] = useState([])
  const [singleCountry, setSingleCountry] = useState(null)
  const [matrixVar, setMatrixVar] = useState(null) // for individual-level ranked correlations
  const [matrixSort, setMatrixSort] = useState('abs_r') // 'abs_r' | 'r' | 'name'
  const [loading, setLoading] = useState(false)
  const chartRef = useRef(null)

  // ── Load wave data ──
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await Promise.all([
          loadWaveMetadata(wave),
          loadWaveDistributions(wave),
          loadWaveCorrelations(wave),
        ])
      } catch (err) {
        console.error('Failed to load wave data:', err)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [wave, loadWaveMetadata, loadWaveDistributions, loadWaveCorrelations])

  const metadata = waveMetadata[wave]
  const distributions = waveDistributions[wave]
  const corrData = waveCorrelations[wave]
  const countries = useMemo(() => getWaveCountries(wave), [wave, getWaveCountries])

  // ── Eligible variables: only those in correlation _variables list ──
  const eligibleVars = useMemo(() => {
    if (!corrData?.correlations?._variables) return new Set()
    return new Set(corrData.correlations._variables)
  }, [corrData])

  // Filtered metadata: only variables eligible for correlation
  const filteredMetadata = useMemo(() => {
    if (!metadata?.variables || eligibleVars.size === 0) return metadata
    const vars = {}
    for (const [name, info] of Object.entries(metadata.variables)) {
      if (eligibleVars.has(name)) vars[name] = info
    }
    return { ...metadata, variables: vars }
  }, [metadata, eligibleVars])

  // ── Auto-select variables on wave load ──
  useEffect(() => {
    if (filteredMetadata?.variables) {
      const vars = Object.keys(filteredMetadata.variables)
      // Prefer q7 (trust in president) and q105 (regime comparison) as defaults
      const first = vars.includes('q7') ? 'q7'
        : vars.find(v => v.toLowerCase().startsWith('q')) || vars[0]
      const second = vars.includes('q105') ? 'q105'
        : vars.find(v => v !== first && v.toLowerCase().startsWith('q')) || vars[1] || first
      setVarA(first || null)
      setVarB(second || null)
      setMatrixVar(first || null)
    }
  }, [filteredMetadata])

  // ── Auto-select countries on wave load ──
  useEffect(() => {
    if (countries.length > 0) {
      setSelectedCountries(countries.map(c => c.code))
      if (!singleCountry || !countries.find(c => c.code === singleCountry)) {
        setSingleCountry(countries[0]?.code || null)
      }
    }
  }, [countries])

  // ── Variable info ──
  const varAInfo = metadata?.variables?.[varA]
  const varBInfo = metadata?.variables?.[varB]

  // ══════════════════════════════════════════
  // ECOLOGICAL MODE DATA
  // ══════════════════════════════════════════

  const scatterData = useMemo(() => {
    if (mode !== 'ecological' || !distributions?.distributions || !varA || !varB) return []
    const distA = distributions.distributions[varA]
    const distB = distributions.distributions[varB]
    if (!distA || !distB) return []

    const xShort = varA + (varAInfo?.label ? ' — ' + varAInfo.label : '')
    const yShort = varB + (varBInfo?.label ? ' — ' + varBInfo.label : '')

    return selectedCountries
      .filter(cc => {
        const a = distA[cc], b = distB[cc]
        return a?.mean != null && b?.mean != null
      })
      .map(cc => ({
        code: cc,
        name: getCountryName(cc),
        x: distA[cc].mean,
        y: distB[cc].mean,
        xLabel: xShort,
        yLabel: yShort,
        nA: distA[cc].valid_n,
        nB: distB[cc].valid_n,
      }))
  }, [mode, distributions, varA, varB, selectedCountries, getCountryName, varAInfo, varBInfo])

  // ══════════════════════════════════════════
  // INDIVIDUAL MODE DATA
  // ══════════════════════════════════════════

  // Single pair result
  const individualPair = useMemo(() => {
    if (mode !== 'individual' || !corrData?.correlations || !singleCountry || !varA || !varB) return null
    const countryCorr = corrData.correlations[singleCountry]
    return lookupPair(countryCorr, varA, varB)
  }, [mode, corrData, singleCountry, varA, varB])

  // Correlation matrix: all pairs for matrixVar in singleCountry, ranked by |r|
  const matrixRows = useMemo(() => {
    if (mode !== 'individual' || !corrData?.correlations || !singleCountry || !matrixVar) return []
    const countryCorr = corrData.correlations[singleCountry]
    if (!countryCorr) return []

    const rows = []
    const varSet = corrData.correlations._variables || []

    for (const otherVar of varSet) {
      if (otherVar === matrixVar) continue
      const pair = lookupPair(countryCorr, matrixVar, otherVar)
      if (!pair) continue
      const otherInfo = metadata?.variables?.[otherVar]
      rows.push({
        variable: otherVar,
        label: otherInfo?.label || otherVar,
        r: pair.r,
        p: pair.p,
        n: pair.n,
        absR: Math.abs(pair.r),
      })
    }

    // Sort
    if (matrixSort === 'abs_r') {
      rows.sort((a, b) => b.absR - a.absR)
    } else if (matrixSort === 'r') {
      rows.sort((a, b) => b.r - a.r)
    } else {
      rows.sort((a, b) => a.variable.localeCompare(b.variable))
    }

    return rows
  }, [mode, corrData, singleCountry, matrixVar, matrixSort, metadata])

  // ══════════════════════════════════════════
  // SUMMARY TABLE DATA (ecological: means + per-country individual r/p/N)
  // ══════════════════════════════════════════

  const summaryRows = useMemo(() => {
    if (!distributions?.distributions || !varA || !varB) return []
    const distA = distributions.distributions[varA]
    const distB = distributions.distributions[varB]
    if (!distA || !distB) return []

    return countries
      .filter(c => {
        const a = distA[c.code], b = distB[c.code]
        return a?.mean != null && b?.mean != null
      })
      .map(c => {
        const cc = c.code
        const pair = corrData?.correlations
          ? lookupPair(corrData.correlations[cc], varA, varB)
          : null
        return {
          country: c.name,
          code: cc,
          meanA: distA[cc].mean,
          meanB: distB[cc].mean,
          nA: distA[cc].valid_n,
          nB: distB[cc].valid_n,
          r: pair?.r ?? null,
          p: pair?.p ?? null,
          nPair: pair?.n ?? null,
        }
      })
  }, [distributions, corrData, varA, varB, countries])

  // ══════════════════════════════════════════
  // EXPORT HANDLERS
  // ══════════════════════════════════════════

  const handleExportPNG = useCallback(() => {
    exportPNG(chartRef, `abs_corr_wave${wave}_${varA}_${varB}.png`)
  }, [wave, varA, varB])

  const handleExportCSV = useCallback(() => {
    const headers = ['Country', 'Code', `Mean_${varA}`, `Mean_${varB}`, `N_${varA}`, `N_${varB}`, 'r', 'p_value', 'N_paired']
    const rows = summaryRows.map(d => [d.country, d.code, d.meanA, d.meanB, d.nA, d.nB, d.r, d.p, d.nPair])
    exportCSV(rows, headers, `abs_corr_wave${wave}_${varA}_${varB}.csv`)
  }, [summaryRows, wave, varA, varB])

  const handleExportMatrix = useCallback(() => {
    if (matrixRows.length === 0) return
    const headers = ['Variable', 'Label', 'r', 'p_value', 'N']
    const rows = matrixRows.map(d => [d.variable, d.label, d.r, d.p, d.n])
    exportCSV(rows, headers, `abs_matrix_wave${wave}_${singleCountry}_${matrixVar}.csv`)
  }, [matrixRows, wave, singleCountry, matrixVar])

  // ── Axis labels ──
  const xLabel = varA ? `${varA}${varAInfo?.label ? ' — ' + varAInfo.label : ''}` : ''
  const yLabel = varB ? `${varB}${varBInfo?.label ? ' — ' + varBInfo.label : ''}` : ''

  // ── Derived booleans ──
  const showChart = varA && varB && varA !== varB
  const hasData = mode === 'ecological' ? scatterData.length > 0 : individualPair != null

  return (
    <div className="view-page dock-clearance">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header with inline wave selector */}
        <div className="view-header-row animate-fade-up">
          <div>
            <h1>Correlations Explorer</h1>
            <p className="view-subtitle">
              Analyze bivariate relationships at the country level or within individual countries.
            </p>
          </div>
          <WaveSelector value={wave} onChange={setWave} />
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '30vh' }}>
            <div className="spinner" />
            <p className="loading-text">Loading Wave {wave} data…</p>
          </div>
        ) : (
          <div className="explorer-layout animate-fade-up stagger-1">
            {/* ════════ Controls sidebar ════════ */}
            <div className="explorer-controls">

              {/* Mode toggle */}
              <div className="picker-wrap">
                <label className="picker-label">Analysis Level</label>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn${mode === 'ecological' ? ' active' : ''}`}
                    onClick={() => setMode('ecological')}
                  >
                    Country-Level
                  </button>
                  <button
                    className={`mode-btn${mode === 'individual' ? ' active' : ''}`}
                    onClick={() => setMode('individual')}
                  >
                    Individual-Level
                  </button>
                </div>
              </div>

              {/* Variable A */}
              <VariablePicker
                metadata={filteredMetadata}
                value={varA}
                onChange={setVarA}
                label="Variable A (X-axis)"
              />

              {/* Variable B */}
              <VariablePicker
                metadata={filteredMetadata}
                value={varB}
                onChange={setVarB}
                label="Variable B (Y-axis)"
              />

              {/* Same variable warning */}
              {varA && varB && varA === varB && (
                <div className="corr-warning animate-fade-in">
                  Select two different variables to compute a correlation.
                </div>
              )}

              {/* Country selection */}
              {mode === 'ecological' ? (
                <CountryPicker
                  countries={countries}
                  selected={selectedCountries}
                  onChange={setSelectedCountries}
                />
              ) : (
                <div className="picker-wrap">
                  <label className="picker-label">Country</label>
                  <div className="ts-select-wrap">
                    <select
                      className="ts-select"
                      value={singleCountry || ''}
                      onChange={e => setSingleCountry(e.target.value)}
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="ts-select-icon" />
                  </div>
                </div>
              )}

              <ExportBar
                onExportPNG={handleExportPNG}
                onExportCSV={handleExportCSV}
                disabled={!showChart || !hasData}
              />

              <DetailPanel variableInfo={varAInfo} />
              {varA !== varB && <DetailPanel variableInfo={varBInfo} />}
            </div>

            {/* ════════ Main area ════════ */}
            <div className="explorer-main">

              {/* ── ECOLOGICAL: Scatter plot ── */}
              {mode === 'ecological' && showChart && (
                <div ref={chartRef} className="chart-panel">
                  <div className="chart-title-bar">
                    <h3 className="chart-title">
                      {varAInfo?.label || varA}
                      <span style={{ margin: '0 0.4em', color: 'var(--color-text-tertiary)', fontWeight: 400, fontFamily: 'var(--font-body)' }}>×</span>
                      {varBInfo?.label || varB}
                    </h3>
                    <span className="chart-wave-badge">Wave {wave}</span>
                  </div>

                  <ScatterPlot
                    data={scatterData}
                    xLabel={xLabel}
                    yLabel={yLabel}
                  />
                </div>
              )}

              {/* ── INDIVIDUAL: Correlation gauge ── */}
              {mode === 'individual' && showChart && (
                <div ref={chartRef} className="chart-panel">
                  <div className="chart-title-bar">
                    <h3 className="chart-title">Pairwise Correlation</h3>
                    <span className="chart-wave-badge">
                      Wave {wave} · {getCountryName(singleCountry)}
                    </span>
                  </div>

                  <CorrelationGauge
                    r={individualPair?.r}
                    p={individualPair?.p}
                    n={individualPair?.n}
                    varA={varA}
                    varB={varB}
                    varALabel={varAInfo?.label}
                    varBLabel={varBInfo?.label}
                    countryName={getCountryName(singleCountry)}
                  />
                </div>
              )}

              {/* Empty state */}
              {!showChart && (
                <div className="chart-empty">
                  <p>Select two different variables to explore their correlation.</p>
                </div>
              )}

              {/* ── SUMMARY TABLE (ecological mode — merged means + individual r) ── */}
              {mode === 'ecological' && showChart && summaryRows.length > 0 && (
                <div className="corr-summary">
                  <div className="corr-summary-header">
                    <h4 className="corr-summary-title">Country Summary</h4>
                    <span className="corr-summary-count">{summaryRows.length} countries</span>
                  </div>

                  <div className="corr-table-scroll">
                    <table className="corr-table">
                      <thead>
                        <tr>
                          <th>Country</th>
                          <th className="corr-th-num">Mean ({varA})</th>
                          <th className="corr-th-num">Mean ({varB})</th>
                          <th className="corr-th-num">N ({varA})</th>
                          <th className="corr-th-num">N ({varB})</th>
                          <th className="corr-th-num">r</th>
                          <th className="corr-th-num">p-value</th>
                          <th className="corr-th-num">N (paired)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.map(row => (
                          <tr key={row.code}>
                            <td>
                              <span className="stat-dot" style={{ background: `var(--country-${row.code})`, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
                              {row.country}
                            </td>
                            <td className="corr-td-num">{row.meanA?.toFixed(2) ?? '—'}</td>
                            <td className="corr-td-num">{row.meanB?.toFixed(2) ?? '—'}</td>
                            <td className="corr-td-num">{row.nA?.toLocaleString() ?? '—'}</td>
                            <td className="corr-td-num">{row.nB?.toLocaleString() ?? '—'}</td>
                            <td className="corr-td-num">{fmtR(row.r)}</td>
                            <td className="corr-td-num">{fmtP(row.p)}</td>
                            <td className="corr-td-num">{row.nPair?.toLocaleString() ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── INDIVIDUAL: Correlation Matrix Browser ── */}
              {mode === 'individual' && (
                <div className="corr-matrix-section">
                  <div className="corr-matrix-header">
                    <h4 className="corr-summary-title">Correlation Matrix</h4>
                    <span className="corr-matrix-hint">
                      All pairwise correlations for a focal variable in {getCountryName(singleCountry)}
                    </span>
                  </div>

                  <div className="corr-matrix-controls">
                    <div className="picker-wrap" style={{ flex: 1 }}>
                      <label className="picker-label">Focal Variable</label>
                      <div className="ts-select-wrap">
                        <select
                          className="ts-select"
                          value={matrixVar || ''}
                          onChange={e => setMatrixVar(e.target.value)}
                        >
                          {corrData?.correlations?._variables?.map(v => {
                            const info = metadata?.variables?.[v]
                            return (
                              <option key={v} value={v}>
                                {v} — {info?.label || ''}
                              </option>
                            )
                          })}
                        </select>
                        <ChevronDown size={14} className="ts-select-icon" />
                      </div>
                    </div>

                    <div className="picker-wrap" style={{ minWidth: 140 }}>
                      <label className="picker-label">Sort by</label>
                      <div className="ts-select-wrap">
                        <select
                          className="ts-select"
                          value={matrixSort}
                          onChange={e => setMatrixSort(e.target.value)}
                        >
                          <option value="abs_r">|r| (strongest)</option>
                          <option value="r">r (high → low)</option>
                          <option value="name">Variable name</option>
                        </select>
                        <ChevronDown size={14} className="ts-select-icon" />
                      </div>
                    </div>

                    <button
                      className="export-btn"
                      onClick={handleExportMatrix}
                      disabled={matrixRows.length === 0}
                      title="Export matrix as CSV"
                      style={{ alignSelf: 'flex-end', marginBottom: 2 }}
                    >
                      <ArrowUpDown size={14} />
                      <span>CSV</span>
                    </button>
                  </div>

                  {matrixRows.length > 0 ? (
                    <div className="corr-table-scroll" style={{ maxHeight: 420 }}>
                      <table className="corr-table corr-matrix-table">
                        <thead>
                          <tr>
                            <th style={{ width: 80 }}>Variable</th>
                            <th>Label</th>
                            <th className="corr-th-num" style={{ width: 80 }}>r</th>
                            <th className="corr-th-num" style={{ width: 80 }}>p</th>
                            <th className="corr-th-num" style={{ width: 70 }}>N</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrixRows.map(row => (
                            <tr
                              key={row.variable}
                              className={row.absR >= 0.3 ? 'corr-row-strong' : ''}
                              onClick={() => setVarB(row.variable)}
                              style={{ cursor: 'pointer' }}
                              title="Click to set as Variable B"
                            >
                              <td>
                                <span className="corr-matrix-var">{row.variable}</span>
                              </td>
                              <td className="corr-matrix-label">{row.label}</td>
                              <td className="corr-td-num">
                                <span className={`corr-r-badge ${row.r > 0 ? 'positive' : 'negative'}`}>
                                  {fmtR(row.r)}
                                </span>
                              </td>
                              <td className="corr-td-num">{fmtP(row.p)}</td>
                              <td className="corr-td-num">{row.n?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="corr-matrix-empty">
                      No correlation data for {matrixVar} in {getCountryName(singleCountry)}.
                    </div>
                  )}

                  <div className="corr-matrix-footer">
                    Showing {matrixRows.length} pairwise correlations · Click a row to set it as Variable B
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
