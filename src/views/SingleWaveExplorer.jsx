import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useABSData } from '../context/DataProvider'
import WaveSelector from '../components/shared/WaveSelector'
import VariablePicker from '../components/shared/VariablePicker'
import CountryPicker from '../components/shared/CountryPicker'
import DistributionChart from '../components/shared/DistributionChart'
import DetailPanel from '../components/shared/DetailPanel'
import ExportBar from '../components/shared/ExportBar'
import { exportPNG, exportCSV } from '../utils/exportUtils'

const DEFAULT_COUNTRIES = ['JP', 'KR', 'TW', 'TH']

export default function SingleWaveExplorer() {
  const {
    loadWaveMetadata, loadWaveDistributions,
    waveMetadata, waveDistributions,
    getWaveCountries, getCountryName,
  } = useABSData()

  const [wave, setWave] = useState(3)
  const [variable, setVariable] = useState(null)
  const [selectedCountries, setSelectedCountries] = useState(DEFAULT_COUNTRIES)
  const [excludeNR, setExcludeNR] = useState(true)
  const [loading, setLoading] = useState(false)
  const chartRef = useRef(null)

  // Load wave data when wave changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await Promise.all([
          loadWaveMetadata(wave),
          loadWaveDistributions(wave),
        ])
      } catch (err) {
        console.error('Failed to load wave data:', err)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [wave, loadWaveMetadata, loadWaveDistributions])

  // Current wave data
  const metadata = waveMetadata[wave]
  const distributions = waveDistributions[wave]
  const countries = useMemo(() => getWaveCountries(wave), [wave, getWaveCountries])

  // Auto-select first variable when wave loads
  useEffect(() => {
    if (metadata?.variables) {
      const vars = Object.keys(metadata.variables)
      // Pick first substantive question variable (skip country, idnumber, etc.)
      const firstQ = vars.find(v => v.toLowerCase().startsWith('q')) || vars[0]
      setVariable(firstQ)
    }
  }, [metadata])

  // Filter selected countries to those available in current wave
  useEffect(() => {
    if (countries.length > 0) {
      const available = new Set(countries.map(c => c.code))
      const filtered = selectedCountries.filter(c => available.has(c))
      if (filtered.length === 0) {
        // Default to first 4 available
        setSelectedCountries(countries.slice(0, 4).map(c => c.code))
      } else if (filtered.length !== selectedCountries.length) {
        setSelectedCountries(filtered)
      }
    }
  }, [countries])

  // Variable info and distributions for current selection
  const varInfo = metadata?.variables?.[variable]
  const varDist = distributions?.distributions?.[variable]

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const fname = `abs_wave${wave}_${variable || 'chart'}.png`
    exportPNG(chartRef, fname)
  }, [wave, variable])

  const handleExportCSV = useCallback(() => {
    if (!varDist || !varInfo) return

    const headers = ['Country', 'Country_Code', 'Response_Code', 'Response_Label', 'Count', 'Percentage', 'Mean', 'Std', 'Valid_N']
    const rows = []

    for (const cc of selectedCountries) {
      const cd = varDist[cc]
      if (!cd) continue
      const name = getCountryName(cc)

      if (cd.responses) {
        for (const [code, resp] of Object.entries(cd.responses)) {
          const optInfo = varInfo.response_options?.[code]
          if (excludeNR && optInfo && !optInfo.is_substantive) continue
          rows.push([
            name, cc, code,
            optInfo?.label || '',
            resp.count, resp.pct,
            cd.mean, cd.std, cd.valid_n,
          ])
        }
      }
    }

    exportCSV(rows, headers, `abs_wave${wave}_${variable || 'data'}.csv`)
  }, [varDist, varInfo, selectedCountries, excludeNR, wave, variable, getCountryName])

  return (
    <div className="view-page dock-clearance">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header with inline wave selector */}
        <div className="view-header-row animate-fade-up">
          <div>
            <h1>Single-Wave Explorer</h1>
            <p className="view-subtitle">
              Browse response distributions for any variable, comparing across countries.
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
            {/* Controls sidebar */}
            <div className="explorer-controls">
              <VariablePicker
                metadata={metadata}
                value={variable}
                onChange={setVariable}
              />

              <CountryPicker
                countries={countries}
                selected={selectedCountries}
                onChange={setSelectedCountries}
              />

              {/* Non-response toggle */}
              <div className="nr-toggle">
                <label className="nr-toggle-label">
                  <input
                    type="checkbox"
                    checked={excludeNR}
                    onChange={e => setExcludeNR(e.target.checked)}
                    className="nr-checkbox"
                  />
                  <span>Exclude non-responses</span>
                </label>
                <span className="nr-hint">Don't know, Can't choose, Decline to answer, etc.</span>
              </div>

              <ExportBar
                onExportPNG={handleExportPNG}
                onExportCSV={handleExportCSV}
                disabled={!varDist}
              />

              <DetailPanel variableInfo={varInfo} />
            </div>

            {/* Chart area */}
            <div className="explorer-main">
              {varDist && varInfo ? (
                <div ref={chartRef} className="chart-panel">
                  {/* Chart title */}
                  <div className="chart-title-bar">
                    <h3 className="chart-title">{varInfo.label}</h3>
                    <span className="chart-wave-badge">Wave {wave}</span>
                  </div>

                  <DistributionChart
                    distributions={varDist}
                    responseOptions={varInfo.response_options}
                    selectedCountries={selectedCountries}
                    getCountryName={getCountryName}
                    excludeNonResponse={excludeNR}
                  />
                </div>
              ) : (
                <div className="chart-empty">
                  <p>Select a variable to view its distribution.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
