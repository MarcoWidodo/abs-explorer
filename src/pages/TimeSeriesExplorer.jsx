import { useState, useEffect, useMemo, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Info, Download, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useData, useTheme } from '../App'
import { HARMONIZED_VARIABLES, getAllHarmonizedVariables } from '../variableConfig'

const CHART_COLORS_LIGHT = ['#537963', '#8b6b50', '#e26d47', '#687891', '#9fb9a9', '#c2ab85', '#cf5431', '#354d40']
const CHART_COLORS_DARK = ['#6fcf97', '#f2c94c', '#f2994a', '#56ccf2', '#bb6bd9', '#eb5757', '#27ae60', '#9b51e0']

function TimeSeriesExplorer() {
  const { metadata, loadDistribution } = useData()
  const { darkMode } = useTheme()
  const chartContainerRef = useRef(null)
  
  const CHART_COLORS = darkMode ? CHART_COLORS_DARK : CHART_COLORS_LIGHT
  
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedHarmonized, setSelectedHarmonized] = useState('')
  const [selectedCountries, setSelectedCountries] = useState([])
  const [timeSeriesData, setTimeSeriesData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showVariableDetails, setShowVariableDetails] = useState(false)
  const [visualizationType, setVisualizationType] = useState('mean')
  const [selectedResponseValue, setSelectedResponseValue] = useState(1)
  
  const harmonizedVariables = getAllHarmonizedVariables()
  
  // Group by category
  const groupedVars = useMemo(() => {
    const groups = {}
    harmonizedVariables.forEach(hv => {
      const cat = hv.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(hv)
    })
    return groups
  }, [harmonizedVariables])
  
  const categories = Object.keys(groupedVars).sort()
  const variablesInCategory = useMemo(() => groupedVars[selectedCategory] || [], [selectedCategory, groupedVars])
  
  // Set defaults
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0])
  }, [categories])
  
  useEffect(() => {
    if (variablesInCategory.length > 0) {
      const current = variablesInCategory.find(v => v.id === selectedHarmonized)
      if (!current) setSelectedHarmonized(variablesInCategory[0].id)
    }
  }, [variablesInCategory, selectedHarmonized])
  
  const selectedVarInfo = useMemo(() => harmonizedVariables.find(v => v.id === selectedHarmonized), [selectedHarmonized])
  
  // Available countries
  const availableCountries = useMemo(() => {
    if (!metadata || !selectedVarInfo) return {}
    const wavesWithVar = Object.keys(selectedVarInfo.waves)
    const countryPresence = {}
    wavesWithVar.forEach(waveKey => {
      const waveData = metadata[waveKey]
      if (!waveData) return
      for (const [code, name] of Object.entries(waveData.countries || {})) {
        if (!countryPresence[code]) countryPresence[code] = { name, count: 0 }
        countryPresence[code].count++
      }
    })
    const minWaves = Math.ceil(wavesWithVar.length / 2)
    const filtered = {}
    for (const [code, data] of Object.entries(countryPresence)) {
      if (data.count >= minWaves) filtered[code] = data.name
    }
    return filtered
  }, [metadata, selectedVarInfo])
  
  useEffect(() => {
    if (Object.keys(availableCountries).length > 0 && selectedCountries.length === 0) {
      setSelectedCountries(Object.keys(availableCountries).slice(0, 4))
    }
  }, [availableCountries])
  
  useEffect(() => {
    if (Object.keys(availableCountries).length > 0) {
      const valid = selectedCountries.filter(c => availableCountries[c])
      if (valid.length === 0) setSelectedCountries(Object.keys(availableCountries).slice(0, 4))
      else if (valid.length !== selectedCountries.length) setSelectedCountries(valid)
    }
  }, [selectedHarmonized, availableCountries])
  
  // Wave details with full variable info
  const waveDetails = useMemo(() => {
    if (!selectedVarInfo || !metadata) return {}
    const details = {}
    for (const [waveKey, mapping] of Object.entries(selectedVarInfo.waves)) {
      const waveData = metadata[waveKey]
      if (!waveData) continue
      const varInfo = waveData.variables[mapping.var]
      details[waveKey] = {
        waveNum: parseInt(waveKey.replace('wave', '')),
        varName: mapping.var,
        label: varInfo?.label || mapping.var,
        valueLabels: varInfo?.value_labels || {},
        reversed: mapping.reversed || false,
        scale: mapping.scale || [1, 5]
      }
    }
    return details
  }, [selectedVarInfo, metadata])
  
  // Response options
  const responseOptions = useMemo(() => {
    if (!Object.keys(waveDetails).length) return []
    const firstWave = Object.values(waveDetails)[0]
    if (!firstWave?.valueLabels) return []
    const scale = firstWave.scale || [1, 5]
    const options = []
    for (let i = scale[0]; i <= scale[1]; i++) {
      const label = firstWave.valueLabels[i] || firstWave.valueLabels[String(i)] || `Value ${i}`
      if (i >= 7 || i < 0) continue
      options.push({ value: i, label })
    }
    return options
  }, [waveDetails])
  
  const countryColors = useMemo(() => {
    const colors = {}
    Object.keys(availableCountries).forEach((code, i) => {
      colors[code] = CHART_COLORS[i % CHART_COLORS.length]
    })
    return colors
  }, [availableCountries, CHART_COLORS])
  
  const toggleCountry = (code) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) setSelectedCountries(selectedCountries.filter(c => c !== code))
    } else if (selectedCountries.length < 8) {
      setSelectedCountries([...selectedCountries, code])
    }
  }
  
  // Fetch data
  useEffect(() => {
    if (!selectedHarmonized || selectedCountries.length === 0 || !selectedVarInfo || !loadDistribution) return
    
    setLoading(true)
    const promises = Object.entries(selectedVarInfo.waves).map(async ([waveKey, mapping]) => {
      const waveNum = parseInt(waveKey.replace('wave', ''))
      try {
        const data = await loadDistribution(waveKey, mapping.var, selectedCountries)
        return { waveKey, waveNum, data, mapping }
      } catch (err) {
        return { waveKey, waveNum, data: null, mapping }
      }
    })
    
    Promise.all(promises).then(results => {
      const seriesData = {}
      results.forEach(({ waveKey, waveNum, data, mapping }) => {
        if (!data) return
        
        const countryMeans = {}
        const countryProps = {}
        const countryCounts = {}
        
        for (const [countryCode, responses] of Object.entries(data)) {
          const code = countryCode.toString()
          if (!selectedCountries.includes(code)) continue
          
          let totalWeight = 0
          let weightedSum = 0
          const dist = {}
          
          for (const [respValue, count] of Object.entries(responses)) {
            const numResp = parseInt(respValue)
            if (numResp < 0 || numResp >= 7) continue
            
            const weight = count.weighted || count
            totalWeight += weight
            
            let value = numResp
            if (mapping.reversed) {
              const scale = mapping.scale || [1, 5]
              value = scale[1] + scale[0] - numResp
            }
            weightedSum += value * weight
            dist[numResp] = (dist[numResp] || 0) + weight
          }
          
          if (totalWeight > 0) {
            countryMeans[code] = weightedSum / totalWeight
            countryProps[code] = {}
            for (const [rv, cnt] of Object.entries(dist)) {
              countryProps[code][rv] = (cnt / totalWeight) * 100
            }
            countryCounts[code] = totalWeight
          }
        }
        
        seriesData[waveKey] = { waveNum, means: countryMeans, proportions: countryProps, totals: countryCounts }
      })
      
      setTimeSeriesData(seriesData)
      setLoading(false)
    })
  }, [selectedHarmonized, selectedCountries, selectedVarInfo, loadDistribution])
  
  // Chart data
  const chartData = useMemo(() => {
    if (!timeSeriesData) return []
    return Object.entries(timeSeriesData)
      .sort((a, b) => a[1].waveNum - b[1].waveNum)
      .map(([waveKey, waveData]) => {
        const point = { wave: `W${waveData.waveNum}`, waveNum: waveData.waveNum }
        selectedCountries.forEach(code => {
          const name = availableCountries[code] || code
          if (visualizationType === 'mean') {
            if (waveData.means[code] !== undefined) point[name] = parseFloat(waveData.means[code].toFixed(2))
          } else {
            if (waveData.proportions[code]?.[selectedResponseValue] !== undefined) {
              point[name] = parseFloat(waveData.proportions[code][selectedResponseValue].toFixed(1))
            }
          }
        })
        return point
      })
  }, [timeSeriesData, selectedCountries, availableCountries, visualizationType, selectedResponseValue])
  
  const yAxisConfig = useMemo(() => {
    if (visualizationType === 'mean') {
      const scale = selectedVarInfo?.waves ? Object.values(selectedVarInfo.waves)[0]?.scale || [1, 5] : [1, 5]
      return { domain: scale, ticks: Array.from({length: scale[1] - scale[0] + 1}, (_, i) => scale[0] + i) }
    }
    return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] }
  }, [visualizationType, selectedVarInfo])
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className={`p-3 rounded-lg shadow-lg border ${darkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-earth-200'}`}>
        <p className={`font-medium mb-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.stroke }} />
              <span className={darkMode ? 'text-dark-400' : 'text-earth-600'}>{entry.name}</span>
            </span>
            <span className={`font-medium ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
              {visualizationType === 'mean' ? entry.value?.toFixed(2) : `${entry.value?.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    )
  }
  
  const exportCSV = () => {
    if (!chartData.length) return
    const names = selectedCountries.map(c => availableCountries[c] || c)
    const headers = ['Wave', ...names]
    const rows = chartData.map(pt => {
      const vals = [pt.wave]
      names.forEach(n => vals.push(pt[n] !== undefined ? (visualizationType === 'mean' ? pt[n].toFixed(2) : pt[n].toFixed(1)) : ''))
      return vals.join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${selectedHarmonized}_timeseries.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
  }
  
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className={`font-display text-2xl md:text-3xl font-bold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          Time Series Explorer
        </h1>
        <p className={darkMode ? 'text-dark-400' : 'text-earth-600'}>
          Track changes in harmonized variables across survey waves (2001-2020)
        </p>
      </div>
      
      {/* Controls */}
      <div className="card p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Category */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Category</label>
            <div className="select-wrapper">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="text-sm">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          
          {/* Variable */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Variable</label>
            <div className="select-wrapper">
              <select value={selectedHarmonized} onChange={(e) => setSelectedHarmonized(e.target.value)} className="text-sm">
                {variablesInCategory.map(hv => (
                  <option key={hv.id} value={hv.id}>{hv.label} ({Object.keys(hv.waves).length}W)</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Display Type */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Display</label>
            <div className={`flex rounded-lg p-0.5 ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`}>
              <button onClick={() => setVisualizationType('mean')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium ${
                  visualizationType === 'mean' ? (darkMode ? 'bg-dark-700 text-dark-100' : 'bg-white text-earth-900 shadow-sm') : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}>Mean</button>
              <button onClick={() => setVisualizationType('proportion')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium ${
                  visualizationType === 'proportion' ? (darkMode ? 'bg-dark-700 text-dark-100' : 'bg-white text-earth-900 shadow-sm') : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}>%</button>
            </div>
          </div>
          
          {/* Response Value */}
          {visualizationType === 'proportion' && responseOptions.length > 0 && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Response</label>
              <div className="select-wrapper">
                <select value={selectedResponseValue} onChange={(e) => setSelectedResponseValue(parseInt(e.target.value))} className="text-sm">
                  {responseOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}: {opt.label.slice(0, 25)}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Variable Details Toggle */}
        {selectedVarInfo && (
          <div className="mb-4">
            <button
              onClick={() => setShowVariableDetails(!showVariableDetails)}
              className={`text-sm flex items-center gap-1 ${darkMode ? 'text-forest-400 hover:text-forest-300' : 'text-forest-600 hover:text-forest-700'}`}
            >
              <Info className="w-4 h-4" />
              {showVariableDetails ? 'Hide' : 'Show'} variable mapping details
              {showVariableDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showVariableDetails && (
              <div className={`mt-3 p-4 rounded-lg ${darkMode ? 'bg-dark-800' : 'bg-earth-50'}`}>
                <p className={`text-sm mb-2 ${darkMode ? 'text-dark-200' : 'text-earth-800'}`}>
                  <strong>Question:</strong> {selectedVarInfo.description}
                </p>
                {selectedVarInfo.notes && (
                  <p className={`text-sm mb-3 flex items-start gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {selectedVarInfo.notes}
                  </p>
                )}
                
                {/* Per-wave variable details */}
                <div className="space-y-3">
                  {Object.entries(waveDetails)
                    .sort((a, b) => a[1].waveNum - b[1].waveNum)
                    .map(([waveKey, details]) => (
                      <div key={waveKey} className={`p-3 rounded ${darkMode ? 'bg-dark-900' : 'bg-white'}`}>
                        <div className={`font-semibold text-sm mb-2 flex items-center gap-2 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`}>
                          Wave {details.waveNum}: <span className="font-mono">{details.varName}</span>
                          {details.reversed && <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>↔ Reversed</span>}
                        </div>
                        <div className={`text-xs mb-2 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>
                          {details.label}
                        </div>
                        {Object.keys(details.valueLabels).length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                            {Object.entries(details.valueLabels)
                              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                              .map(([val, label]) => (
                                <div key={val} className={`flex gap-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>
                                  <span className="font-mono font-semibold">{val}:</span>
                                  <span className="truncate">{label}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Country Selection */}
        <div>
          <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Countries (max 8)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(availableCountries).map(([code, name]) => (
              <button key={code} onClick={() => toggleCountry(code)}
                className={`chip text-xs ${selectedCountries.includes(code) ? 'selected' : ''}`}
                style={selectedCountries.includes(code) ? { backgroundColor: countryColors[code], color: 'white' } : {}}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-display text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
            <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
            {selectedVarInfo?.label || 'Time Series'}
          </h3>
          <button onClick={exportCSV} className={`btn btn-ghost flex items-center gap-2 text-sm ${darkMode ? 'text-dark-400' : ''}`}>
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-80"><div className="spinner" /></div>
        ) : chartData.length > 0 ? (
          <div ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#454655' : '#d4c5a9'} opacity={0.5} />
                <XAxis dataKey="wave" tick={{ fontSize: 12, fill: darkMode ? '#b1b3be' : '#725845' }} />
                <YAxis domain={yAxisConfig.domain} ticks={yAxisConfig.ticks}
                  tick={{ fontSize: 12, fill: darkMode ? '#b1b3be' : '#725845' }}
                  label={{ value: visualizationType === 'mean' ? 'Mean' : '%', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: darkMode ? '#b1b3be' : '#725845' }}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedCountries.map(code => (
                  <Line key={code} type="monotone" dataKey={availableCountries[code] || code}
                    stroke={countryColors[code]} strokeWidth={2} dot={{ r: 4, fill: countryColors[code] }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-80 ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
            Select a variable and countries
          </div>
        )}
      </div>
      
      {/* Data Table */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Wave</th>
                  {selectedCountries.map(c => (
                    <th key={c}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: countryColors[c] }} />
                      {availableCountries[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium">{row.wave}</td>
                    {selectedCountries.map(c => {
                      const name = availableCountries[c] || c
                      const val = row[name]
                      return <td key={c} className="font-mono">{val !== undefined ? (visualizationType === 'mean' ? val.toFixed(2) : `${val.toFixed(1)}%`) : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeSeriesExplorer
