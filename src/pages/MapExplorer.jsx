import { useState, useEffect, useMemo } from 'react'
import { Download, Globe, Search, ArrowUpDown, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { useData, useTheme } from '../App'
import { isNonResponse } from '../variableConfig'
import ChoroplethMap from '../components/ChoroplethMap'

const COUNTRIES_DATA = {
  1: { name: "Japan" }, 2: { name: "Hong Kong" }, 3: { name: "South Korea" },
  4: { name: "China" }, 5: { name: "Mongolia" }, 6: { name: "Philippines" },
  7: { name: "Taiwan" }, 8: { name: "Thailand" }, 9: { name: "Indonesia" },
  10: { name: "Singapore" }, 11: { name: "Vietnam" }, 12: { name: "Cambodia" },
  13: { name: "Malaysia" }, 14: { name: "Myanmar" }, 15: { name: "Australia" },
  18: { name: "India" }
}

function MapExplorer() {
  const { metadata, loadDistribution } = useData()
  const { darkMode } = useTheme()
  
  const [selectedWave, setSelectedWave] = useState('wave5')
  const [selectedVariable, setSelectedVariable] = useState('')
  const [distributionData, setDistributionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [visualizationType, setVisualizationType] = useState('mean')
  const [selectedResponseValue, setSelectedResponseValue] = useState(1)
  const [sortBy, setSortBy] = useState('value')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showVarDetails, setShowVarDetails] = useState(false)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  
  const waveOptions = metadata ? Object.keys(metadata).map(key => ({
    value: key,
    label: `Wave ${metadata[key].wave} (${key === 'wave1' ? '2001-03' : key === 'wave2' ? '2005-08' : key === 'wave3' ? '2010-12' : key === 'wave4' ? '2014-16' : '2018-21'})`
  })) : []
  
  const variables = useMemo(() => {
    if (!metadata || !selectedWave) return []
    const waveData = metadata[selectedWave]
    if (!waveData) return []
    return Object.entries(waveData.variables)
      .map(([key, info]) => [key, info.label || key])
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
  }, [metadata, selectedWave])
  
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return variables
    const term = searchTerm.toLowerCase()
    return variables.filter(([key, label]) => key.toLowerCase().includes(term) || (label && label.toLowerCase().includes(term)))
  }, [variables, searchTerm])
  
  useEffect(() => {
    if (variables.length > 0 && !selectedVariable) {
      setSelectedVariable(variables[0][0])
    }
  }, [selectedWave, variables.length])
  
  useEffect(() => {
    if (!selectedWave || !selectedVariable || !loadDistribution) return
    setLoading(true)
    loadDistribution(selectedWave, selectedVariable)
      .then(data => { setDistributionData(data); setLoading(false) })
      .catch(() => { setDistributionData(null); setLoading(false) })
  }, [selectedWave, selectedVariable, loadDistribution])
  
  const varInfo = useMemo(() => {
    if (!metadata || !selectedWave || !selectedVariable) return null
    return metadata[selectedWave]?.variables[selectedVariable]
  }, [metadata, selectedWave, selectedVariable])
  
  const responseOptions = useMemo(() => {
    if (!varInfo?.value_labels) return []
    const options = []
    for (const [code, label] of Object.entries(varInfo.value_labels)) {
      const numCode = parseInt(code)
      if (numCode > 0 && numCode < 90 && !isNonResponse(numCode, label)) {
        options.push({ value: numCode, label })
      }
    }
    return options.sort((a, b) => a.value - b.value)
  }, [varInfo])
  
  useEffect(() => {
    if (responseOptions.length > 0 && !responseOptions.find(o => o.value === selectedResponseValue)) {
      setSelectedResponseValue(responseOptions[0].value)
    }
  }, [responseOptions])
  
  const countryStats = useMemo(() => {
    if (!distributionData || !metadata) return {}
    const stats = {}
    const waveData = metadata?.[selectedWave]
    
    for (const [countryCode, responses] of Object.entries(distributionData)) {
      const code = parseInt(countryCode)
      let totalWeight = 0, weightedSum = 0
      const dist = {}
      
      for (const [respValue, count] of Object.entries(responses)) {
        const numResp = parseInt(respValue)
        const valueLabel = varInfo?.value_labels?.[numResp] || ''
        if (isNonResponse(numResp, valueLabel)) continue
        const weight = count.weighted || count
        totalWeight += weight
        weightedSum += numResp * weight
        dist[numResp] = (dist[numResp] || 0) + weight
      }
      
      if (totalWeight > 0) {
        const proportions = {}
        for (const [rv, cnt] of Object.entries(dist)) {
          proportions[rv] = (cnt / totalWeight) * 100
        }
        stats[code] = {
          mean: weightedSum / totalWeight,
          n: Math.round(totalWeight),
          name: waveData?.countries[code] || COUNTRIES_DATA[code]?.name || `Country ${code}`,
          proportions,
          proportion: proportions[selectedResponseValue] || 0
        }
      }
    }
    return stats
  }, [distributionData, metadata, selectedWave, varInfo, selectedResponseValue])
  
  const scaleRange = useMemo(() => {
    if (!varInfo?.value_labels) return [1, 5]
    const validValues = Object.keys(varInfo.value_labels)
      .map(Number)
      .filter(v => v > 0 && v < 90 && !isNonResponse(v, varInfo.value_labels[v]))
      .sort((a, b) => a - b)
    return [validValues[0] || 1, validValues[validValues.length - 1] || 5]
  }, [varInfo])
  
  const getDisplayValue = (code) => {
    const stat = countryStats[code]
    if (!stat) return null
    return visualizationType === 'mean' ? stat.mean : (stat.proportions[selectedResponseValue] || 0)
  }
  
  const sortedCountries = useMemo(() => {
    const entries = Object.entries(countryStats)
    if (sortBy === 'value') {
      entries.sort((a, b) => {
        const aVal = getDisplayValue(parseInt(a[0])) || 0
        const bVal = getDisplayValue(parseInt(b[0])) || 0
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      })
    } else {
      entries.sort((a, b) => sortOrder === 'desc' 
        ? b[1].name.localeCompare(a[1].name)
        : a[1].name.localeCompare(b[1].name))
    }
    return entries
  }, [countryStats, sortBy, sortOrder, visualizationType, selectedResponseValue])
  
  const exportCSV = () => {
    const headers = ['Rank', 'Country', visualizationType === 'mean' ? 'Mean' : `% Response ${selectedResponseValue}`, 'N']
    const rows = sortedCountries.map(([code, data], i) => [
      i + 1, data.name,
      visualizationType === 'mean' ? data.mean.toFixed(2) : `${(data.proportions[selectedResponseValue] || 0).toFixed(1)}%`,
      data.n
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `abs_map_${selectedWave}_${selectedVariable}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
  }
  
  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    else { setSortBy(field); setSortOrder('desc') }
  }
  
  // Prepare data for ChoroplethMap component
  const mapDisplayData = useMemo(() => {
    const data = {}
    for (const [code, stat] of Object.entries(countryStats)) {
      data[parseInt(code)] = {
        mean: stat.mean,
        proportion: stat.proportions[selectedResponseValue] || 0,
        n: stat.n,
        name: stat.name
      }
    }
    return data
  }, [countryStats, selectedResponseValue])
  
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className={`font-display text-2xl md:text-3xl font-bold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          Map Explorer
        </h1>
        <p className={darkMode ? 'text-dark-400' : 'text-earth-600'}>
          Compare survey responses across Asian countries
        </p>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="card p-6 lg:col-span-1 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>Survey Wave</label>
            <div className="select-wrapper">
              <select value={selectedWave} onChange={(e) => { setSelectedWave(e.target.value); setSelectedVariable('') }}>
                {waveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>Search Variables</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-dark-500' : 'text-earth-400'}`} />
              <input
                type="text"
                placeholder="Search by code or label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg border ${darkMode ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-earth-200 text-earth-900'}`}
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>Variable ({filteredVariables.length})</label>
            <div className={`max-h-64 overflow-y-auto rounded-lg border ${darkMode ? 'border-dark-700' : 'border-earth-200'}`}>
              {filteredVariables.slice(0, 100).map(([varKey, varLabel]) => (
                <button
                  key={varKey}
                  onClick={() => setSelectedVariable(varKey)}
                  className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${darkMode ? 'border-dark-700' : 'border-earth-100'} ${
                    selectedVariable === varKey
                      ? (darkMode ? 'bg-forest-900/50 text-forest-300' : 'bg-forest-100 text-forest-800')
                      : (darkMode ? 'hover:bg-dark-800 text-dark-300' : 'hover:bg-earth-50 text-earth-700')
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{varKey}</span>
                  <span className={`block text-xs mt-1 leading-relaxed ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>{varLabel}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>Display Type</label>
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`}>
              <button
                onClick={() => setVisualizationType('mean')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  visualizationType === 'mean' ? (darkMode ? 'bg-dark-700 text-dark-100' : 'bg-white text-earth-900 shadow-sm') : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}
              >Mean</button>
              <button
                onClick={() => setVisualizationType('proportion')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  visualizationType === 'proportion' ? (darkMode ? 'bg-dark-700 text-dark-100' : 'bg-white text-earth-900 shadow-sm') : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}
              >Proportion</button>
            </div>
            
            {visualizationType === 'proportion' && responseOptions.length > 0 && (
              <div className="mt-3">
                <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Show % responding:</label>
                <div className="select-wrapper">
                  <select value={selectedResponseValue} onChange={(e) => setSelectedResponseValue(parseInt(e.target.value))} className="text-sm">
                    {responseOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}: {opt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Map and Results */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex-1 min-w-0">
              <h3 className={`font-display text-lg font-semibold flex items-start gap-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
                <Globe className={`w-5 h-5 flex-shrink-0 mt-1 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
                <span className="leading-tight">{varInfo?.label || selectedVariable || 'Select a variable'}</span>
              </h3>
              {varInfo && (
                <button
                  onClick={() => setShowVarDetails(!showVarDetails)}
                  className={`mt-2 text-xs flex items-center gap-1 ${darkMode ? 'text-dark-400 hover:text-dark-300' : 'text-earth-500 hover:text-earth-700'}`}
                >
                  <Info className="w-3 h-3" /> {showVarDetails ? 'Hide' : 'Show'} response labels
                  {showVarDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <button onClick={exportCSV} className={`btn btn-ghost flex items-center gap-2 text-sm flex-shrink-0 ${darkMode ? 'text-dark-400' : ''}`}>
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
          
          {showVarDetails && varInfo?.value_labels && (
            <div className={`mb-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-dark-800' : 'bg-earth-50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {Object.entries(varInfo.value_labels).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([val, label]) => (
                  <div key={val} className={`flex gap-2 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>
                    <span className="font-mono font-semibold w-6">{val}:</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center h-[450px]"><div className="spinner" /></div>
          ) : (
            <>
              {/* Choropleth Map */}
              <div className="rounded-xl overflow-hidden mb-6">
                <ChoroplethMap
                  data={mapDisplayData}
                  darkMode={darkMode}
                  displayType={visualizationType}
                  scaleRange={scaleRange}
                  height={450}
                  onCountryHover={(code, data) => setHoveredCountry(data ? { code, ...data } : null)}
                />
              </div>
              
              {/* Data Table */}
              {sortedCountries.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="data-table text-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th><button onClick={() => toggleSort('name')} className="flex items-center gap-1">Country <ArrowUpDown className="w-3 h-3" /></button></th>
                        <th><button onClick={() => toggleSort('value')} className="flex items-center gap-1">{visualizationType === 'mean' ? 'Mean' : 'Proportion'} <ArrowUpDown className="w-3 h-3" /></button></th>
                        <th>N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCountries.map(([code, data], i) => (
                        <tr key={code} className={hoveredCountry?.code === parseInt(code) ? (darkMode ? 'bg-forest-900/30' : 'bg-forest-50') : ''}>
                          <td className="font-medium">{i + 1}</td>
                          <td>{data.name}</td>
                          <td className="font-mono">{visualizationType === 'mean' ? data.mean.toFixed(2) : `${(data.proportions[selectedResponseValue] || 0).toFixed(1)}%`}</td>
                          <td className="font-mono">{data.n.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapExplorer
