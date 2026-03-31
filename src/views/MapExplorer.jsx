import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useABSData } from '../context/DataProvider'
import WaveSelector from '../components/shared/WaveSelector'
import VariablePicker from '../components/shared/VariablePicker'
import ChoroplethMap, { COLOR_SCHEMES } from '../components/shared/ChoroplethMap'
import DetailPanel from '../components/shared/DetailPanel'
import ExportBar from '../components/shared/ExportBar'
import { exportPNG, exportCSV } from '../utils/exportUtils'

export default function MapExplorer() {
  const {
    loadWaveMetadata, loadWaveDistributions,
    waveMetadata, waveDistributions,
    getCountryName,
  } = useABSData()

  const [wave, setWave] = useState(3)
  const [variable, setVariable] = useState(null)
  const [colorScheme, setColorScheme] = useState('Yellow → Red')
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const chartRef = useRef(null)

  // Load wave data
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

  const metadata = waveMetadata[wave]
  const distributions = waveDistributions[wave]

  // Auto-select first variable
  useEffect(() => {
    if (metadata?.variables) {
      const vars = Object.keys(metadata.variables)
      const firstQ = vars.find(v => v.toLowerCase().startsWith('q')) || vars[0]
      setVariable(firstQ)
    }
  }, [metadata])

  const varInfo = metadata?.variables?.[variable]
  const varDist = distributions?.distributions?.[variable]

  // Export handlers
  const handleExportPNG = useCallback(() => {
    exportPNG(chartRef, `abs_map_wave${wave}_${variable || 'chart'}.png`)
  }, [wave, variable])

  const handleExportCSV = useCallback(() => {
    if (!varDist || !varInfo) return
    const headers = ['Country', 'Country_Code', 'Mean', 'Std', 'Median', 'Valid_N', 'Total_N']
    const rows = []

    for (const [cc, cd] of Object.entries(varDist)) {
      if (cc === '_ALL') continue
      if (cd.mean == null) continue
      rows.push([
        getCountryName(cc), cc,
        cd.mean, cd.std, cd.median,
        cd.valid_n, cd.total_n,
      ])
    }

    rows.sort((a, b) => (b[2] ?? 0) - (a[2] ?? 0))
    exportCSV(rows, headers, `abs_map_wave${wave}_${variable || 'data'}.csv`)
  }, [varDist, varInfo, wave, variable, getCountryName])

  const schemeNames = Object.keys(COLOR_SCHEMES)

  return (
    <div className="view-page dock-clearance">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="view-header-row animate-fade-up">
          <div>
            <h1>Choropleth Map</h1>
            <p className="view-subtitle">
              Visualize country-level means on an interactive Asia-Pacific map.
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
            {/* Controls */}
            <div className="explorer-controls">
              <VariablePicker
                metadata={metadata}
                value={variable}
                onChange={setVariable}
              />

              {/* Color scheme */}
              <div className="picker-wrap">
                <label className="picker-label">Color Scale</label>
                <div className="ts-select-wrap">
                  <select
                    className="ts-select"
                    value={colorScheme}
                    onChange={e => setColorScheme(e.target.value)}
                  >
                    {schemeNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="ts-select-icon" />
                </div>
              </div>

              {/* Flip gradient */}
              <div className="nr-toggle">
                <label className="nr-toggle-label">
                  <input
                    type="checkbox"
                    checked={flipped}
                    onChange={e => setFlipped(e.target.checked)}
                    className="nr-checkbox"
                  />
                  <span>Flip gradient direction</span>
                </label>
                <span className="nr-hint">Reverse which end of the scale gets darker colors.</span>
              </div>

              <ExportBar
                onExportPNG={handleExportPNG}
                onExportCSV={handleExportCSV}
                disabled={!varDist}
              />

              <DetailPanel variableInfo={varInfo} />
            </div>
            <div className="explorer-main">
              {varDist ? (
                <div ref={chartRef} className="chart-panel">
                  <div className="chart-title-bar">
                    <h3 className="chart-title">{varInfo?.label}</h3>
                    <span className="chart-wave-badge">Wave {wave}</span>
                  </div>

                  <ChoroplethMap
                    distributions={varDist}
                    colorScheme={colorScheme}
                    flipped={flipped}
                    getCountryName={getCountryName}
                  />
                </div>
              ) : (
                <div className="chart-empty">
                  <p>Select a variable to visualize on the map.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
