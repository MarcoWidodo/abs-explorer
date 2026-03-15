import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Search, X, Info, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { useData, useTheme } from '../App'
import { getCategoriesForWave, isHarmonizedVariable, getHarmonizedInfo } from '../variableConfig'

// Chart colors for light mode
const CHART_COLORS_LIGHT = [
  '#537963', '#8b6b50', '#e26d47', '#687891', '#9fb9a9',
  '#c2ab85', '#cf5431', '#354d40', '#b4956b', '#40604e',
  '#ed8e6f', '#725845', '#8795ab', '#5e493b', '#a7835f', '#2c3f35',
]

// Chart colors for dark mode
const CHART_COLORS_DARK = [
  '#6fcf97', '#f2c94c', '#f2994a', '#56ccf2', '#bb6bd9',
  '#eb5757', '#27ae60', '#9b51e0', '#2d9cdb', '#f2c94c',
  '#ff8a80', '#80cbc4', '#b39ddb', '#ffab91', '#a5d6a7', '#90caf9',
]

// Non-response patterns - comprehensive detection
const NON_RESPONSE_VALUES = new Set([-1, 0, 7, 8, 9, 95, 96, 97, 98, 99])
const NON_RESPONSE_KEYWORDS = [
  'missing', "don't know", 'do not understand', "can't choose", 
  'decline to answer', 'not applicable', 'refused', 'no answer',
  'cannot choose', "can't determine", "don't understand",
  'do not undertstand', 'don\'t understand the question'
]

function isNonResponse(value, label) {
  // First check if the label contains non-response keywords (regardless of value)
  if (label) {
    const labelLower = label.toLowerCase()
    if (NON_RESPONSE_KEYWORDS.some(keyword => labelLower.includes(keyword))) {
      return true
    }
  }
  // Then check if the numeric value is a known non-response code
  // Only flag as non-response if value is in non-response range AND doesn't look like a valid substantive response
  if (NON_RESPONSE_VALUES.has(value)) {
    // For values like 7, 8, 9 - check if they might be valid scale values
    // If no label or label looks like non-response, treat as non-response
    if (!label) return true
    const labelLower = label.toLowerCase()
    // If label is just a number or looks substantive, it's probably valid
    if (labelLower.match(/^\d+$/) || labelLower.length < 3) return false
    return NON_RESPONSE_KEYWORDS.some(keyword => labelLower.includes(keyword))
  }
  return false
}

function SingleVariableExplorer() {
  const { metadata } = useData()
  const { darkMode } = useTheme()
  const chartContainerRef = useRef(null)
  
  // State
  const [selectedWave, setSelectedWave] = useState('wave5')
  const [selectedVariable, setSelectedVariable] = useState('')
  const [selectedCountries, setSelectedCountries] = useState([])
  const [plotMetric, setPlotMetric] = useState('percent')
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [variableSearch, setVariableSearch] = useState('')
  const [showVariableDropdown, setShowVariableDropdown] = useState(false)
  const [excludeNonResponse, setExcludeNonResponse] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState(null)
  
  // Get chart colors based on theme
  const CHART_COLORS = darkMode ? CHART_COLORS_DARK : CHART_COLORS_LIGHT
  
  // Get current wave data
  const currentWave = metadata?.[selectedWave]
  
  // Get all variables as entries
  const allVariables = useMemo(() => {
    if (!currentWave) return []
    return Object.entries(currentWave.variables)
  }, [currentWave])
  
  // Get categorized variables
  const categorizedVariables = useMemo(() => {
    if (!currentWave) return {}
    return getCategoriesForWave(selectedWave, allVariables)
  }, [currentWave, selectedWave, allVariables])
  
  // Filter variables based on search
  const filterVariables = useCallback((vars) => {
    if (!variableSearch) return vars
    const searchLower = variableSearch.toLowerCase()
    return vars.filter(([key, val]) => 
      key.toLowerCase().includes(searchLower) || 
      val.label.toLowerCase().includes(searchLower)
    )
  }, [variableSearch])
  
  // Get filtered categories
  const filteredCategories = useMemo(() => {
    const result = {}
    for (const [cat, data] of Object.entries(categorizedVariables)) {
      const filtered = filterVariables(data.variables)
      if (filtered.length > 0) {
        result[cat] = { ...data, variables: filtered }
      }
    }
    return result
  }, [categorizedVariables, variableSearch])
  
  // Set default variable when wave changes
  useEffect(() => {
    if (currentWave && !selectedVariable) {
      const firstVar = Object.keys(currentWave.variables)[0]
      if (firstVar) setSelectedVariable(firstVar)
    }
  }, [currentWave, selectedVariable])
  
  // Set default countries when wave changes
  useEffect(() => {
    if (currentWave && selectedCountries.length === 0) {
      const countries = Object.keys(currentWave.countries).slice(0, 3)
      setSelectedCountries(countries)
    }
  }, [currentWave])
  
  // Reset variable selection when wave changes
  useEffect(() => {
    if (currentWave) {
      const vars = Object.keys(currentWave.variables)
      if (!vars.includes(selectedVariable) && vars.length > 0) {
        setSelectedVariable(vars[0])
      }
      const countries = Object.keys(currentWave.countries).slice(0, 3)
      setSelectedCountries(countries)
    }
  }, [selectedWave])
  
  // Fetch chart data
  useEffect(() => {
    if (!selectedVariable || selectedCountries.length === 0) return
    
    setLoading(true)
    fetch(`/api/distribution?wave=${selectedWave}&variable=${selectedVariable}&countries=${selectedCountries.join(',')}`)
      .then(res => res.json())
      .then(data => {
        setChartData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch distribution:', err)
        setLoading(false)
      })
  }, [selectedWave, selectedVariable, selectedCountries])
  
  // Get variable info
  const variableInfo = currentWave?.variables[selectedVariable]
  
  // Create country color mapping
  const countryColors = useMemo(() => {
    if (!currentWave) return {}
    const colors = {}
    Object.keys(currentWave.countries).forEach((code, i) => {
      colors[code] = CHART_COLORS[i % CHART_COLORS.length]
    })
    return colors
  }, [currentWave, CHART_COLORS])
  
  // Toggle country selection
  const toggleCountry = (code) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) {
        setSelectedCountries(selectedCountries.filter(c => c !== code))
      }
    } else if (selectedCountries.length < 6) {
      setSelectedCountries([...selectedCountries, code])
    }
  }
  
  // Get country names for selected countries
  const selectedCountryNames = useMemo(() => {
    if (!currentWave) return []
    return selectedCountries.map(code => currentWave.countries[code]).filter(Boolean)
  }, [selectedCountries, currentWave])
  
  // Format chart data for display
  const formattedChartData = useMemo(() => {
    if (!chartData?.data) return []
    
    // Group by response value
    const grouped = {}
    chartData.data.forEach(item => {
      const label = item.response_label || item.response_value
      
      // Filter out non-responses if enabled
      if (excludeNonResponse && isNonResponse(item.response_value, label)) {
        return
      }
      
      if (!grouped[label]) {
        grouped[label] = { response: label, order: item.response_value }
      }
      const countryName = currentWave?.countries[item.country_code] || item.country_code
      grouped[label][countryName] = plotMetric === 'percent' ? item.percent : item.weighted_count
    })
    
    // Recalculate percentages if filtering non-responses
    if (excludeNonResponse && plotMetric === 'percent') {
      const countryTotals = {}
      Object.values(grouped).forEach(row => {
        selectedCountryNames.forEach(name => {
          if (row[name] !== undefined) {
            countryTotals[name] = (countryTotals[name] || 0) + row[name]
          }
        })
      })
      Object.values(grouped).forEach(row => {
        selectedCountryNames.forEach(name => {
          if (row[name] !== undefined && countryTotals[name] > 0) {
            row[name] = (row[name] / countryTotals[name]) * 100
          }
        })
      })
    }
    
    return Object.values(grouped).sort((a, b) => a.order - b.order)
  }, [chartData, plotMetric, currentWave, excludeNonResponse, selectedCountryNames])
  
  // Export chart as PNG with title and legend
  const exportChart = async () => {
    if (!chartContainerRef.current) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const svgElement = chartContainerRef.current.querySelector('svg')
    if (!svgElement) return
    
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const img = new Image()
    
    img.onload = () => {
      const padding = 40
      const titleHeight = 60
      const legendHeight = 60
      
      canvas.width = (img.width + padding * 2) * 2
      canvas.height = (img.height + titleHeight + legendHeight + padding * 2) * 2
      ctx.scale(2, 2)
      
      // Background
      ctx.fillStyle = darkMode ? '#131316' : '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Title
      ctx.fillStyle = darkMode ? '#ececef' : '#32261f'
      ctx.font = 'bold 14px "DM Sans", sans-serif'
      ctx.textAlign = 'center'
      
      const title = variableInfo?.label || selectedVariable
      const maxWidth = img.width + padding
      const words = title.split(' ')
      let line = ''
      let y = padding + 15
      const lineHeight = 18
      
      for (let word of words) {
        const testLine = line + word + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), (img.width + padding * 2) / 2, y)
          line = word + ' '
          y += lineHeight
        } else {
          line = testLine
        }
      }
      ctx.fillText(line.trim(), (img.width + padding * 2) / 2, y)
      
      // Draw chart
      ctx.drawImage(img, padding, titleHeight + padding)
      
      // Draw legend
      const legendY = titleHeight + img.height + padding + 20
      const legendItemWidth = 100
      const startX = (img.width + padding * 2 - selectedCountries.length * legendItemWidth) / 2
      
      selectedCountries.forEach((code, i) => {
        const x = startX + i * legendItemWidth
        ctx.fillStyle = countryColors[code]
        ctx.fillRect(x, legendY - 6, 12, 12)
        
        ctx.fillStyle = darkMode ? '#b1b3be' : '#725845'
        ctx.font = '12px "DM Sans", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(currentWave?.countries[code] || code, x + 16, legendY + 4)
      })
      
      const link = document.createElement('a')
      link.download = `${selectedVariable}_distribution.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }
  
  // Export table as CSV
  const exportTableCSV = (type) => {
    if (!formattedChartData.length) return
    
    const headers = ['Response', ...selectedCountryNames]
    const rows = formattedChartData.map(row => {
      const values = [`"${row.response}"`]
      selectedCountryNames.forEach(name => {
        const val = row[name]
        if (type === 'percent') {
          values.push(val !== undefined ? val.toFixed(1) : '')
        } else {
          values.push(val !== undefined ? Math.round(val) : '')
        }
      })
      return values.join(',')
    })
    
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${selectedVariable}_${type}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
  }
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    
    return (
      <div className={`p-3 rounded-lg shadow-lg border ${darkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-earth-200'}`}>
        <p className={`font-medium mb-2 max-w-xs ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className={darkMode ? 'text-dark-400' : 'text-earth-600'}>{entry.name}</span>
            </span>
            <span className={`font-medium ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
              {plotMetric === 'percent' ? `${entry.value?.toFixed(1)}%` : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  
  // Custom X-axis tick with text wrapping
  const CustomXAxisTick = ({ x, y, payload }) => {
    const text = payload.value || ''
    const lineHeight = 14
    
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (testLine.length > 18 && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    
    const displayLines = lines.slice(0, 3)
    if (lines.length > 3) {
      displayLines[2] = displayLines[2].slice(0, 15) + '...'
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        {displayLines.map((line, i) => (
          <text
            key={i}
            x={0}
            y={i * lineHeight + 10}
            textAnchor="middle"
            fill={darkMode ? '#b1b3be' : '#725845'}
            fontSize={11}
          >
            {line}
          </text>
        ))}
      </g>
    )
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.variable-dropdown')) {
        setShowVariableDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className={`font-display text-2xl md:text-3xl font-bold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          Single Variable Explorer
        </h1>
        <p className={darkMode ? 'text-dark-400' : 'text-earth-600'}>
          Explore the distribution of survey responses across countries
        </p>
      </div>
      
      {/* Controls */}
      <div className="card p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wave Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
              Survey Wave
            </label>
            <div className="select-wrapper">
              <select
                value={selectedWave}
                onChange={(e) => setSelectedWave(e.target.value)}
                className="w-full"
              >
                {metadata && Object.entries(metadata).map(([key, wave]) => (
                  <option key={key} value={key}>
                    Wave {wave.wave} ({wave.n_respondents.toLocaleString()} respondents)
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Variable Selection with Categories */}
          <div className="lg:col-span-2 variable-dropdown">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
              Variable
            </label>
            <div className="relative">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-dark-400' : 'text-earth-400'}`} />
                <input
                  type="text"
                  value={variableSearch}
                  onChange={(e) => {
                    e.stopPropagation()
                    setVariableSearch(e.target.value)
                    setShowVariableDropdown(true)
                  }}
                  onFocus={(e) => {
                    e.stopPropagation()
                    setShowVariableDropdown(true)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search variables..."
                  className="input pl-10 pr-10"
                />
                {variableSearch && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setVariableSearch('')
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-dark-400 hover:text-dark-200' : 'text-earth-400 hover:text-earth-600'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {showVariableDropdown && (
                <div 
                  className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-80 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-dark-900 border-dark-700' : 'bg-white border-earth-200'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {Object.entries(filteredCategories).map(([category, data]) => (
                    <div key={category}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedCategory(expandedCategory === category ? null : category)
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
                          darkMode 
                            ? 'bg-dark-800 text-dark-200 hover:bg-dark-700' 
                            : 'bg-earth-50 text-earth-700 hover:bg-earth-100'
                        }`}
                      >
                        <span>{category} ({data.variables.length})</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {(expandedCategory === category || variableSearch) && (
                        <div>
                          {data.variables.slice(0, 50).map(([key, val]) => (
                            <button
                              key={key}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedVariable(key)
                                setVariableSearch('')
                                setShowVariableDropdown(false)
                              }}
                              className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                                selectedVariable === key 
                                  ? (darkMode ? 'bg-forest-900/30 text-forest-300' : 'bg-forest-50 text-forest-700')
                                  : (darkMode ? 'hover:bg-dark-800' : 'hover:bg-earth-50')
                              }`}
                            >
                              <span className={`font-mono text-xs mr-2 ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>{key}</span>
                              <span className={darkMode ? 'text-dark-200' : 'text-earth-800'}>
                                {val.label.slice(0, 60)}{val.label.length > 60 ? '...' : ''}
                              </span>
                            </button>
                          ))}
                          {data.variables.length > 50 && (
                            <div className={`px-6 py-2 text-sm ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>
                              +{data.variables.length - 50} more variables...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected variable display */}
            {selectedVariable && variableInfo && !showVariableDropdown && (
              <div className={`mt-2 p-3 rounded-lg ${darkMode ? 'bg-dark-800/50' : 'bg-earth-50'}`}>
                <div className="flex items-start gap-2">
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>
                        {selectedVariable}
                      </span>
                      {isHarmonizedVariable(selectedWave, selectedVariable) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-forest-900/50 text-forest-400' : 'bg-forest-100 text-forest-700'}`}>
                          Harmonized across waves
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
                      {variableInfo.label}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Metric Toggle */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
              Display Metric
            </label>
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`}>
              <button
                onClick={() => setPlotMetric('percent')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  plotMetric === 'percent'
                    ? (darkMode ? 'bg-dark-700 text-dark-100 shadow-sm' : 'bg-white text-earth-900 shadow-sm')
                    : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}
              >
                Percent
              </button>
              <button
                onClick={() => setPlotMetric('count')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  plotMetric === 'count'
                    ? (darkMode ? 'bg-dark-700 text-dark-100 shadow-sm' : 'bg-white text-earth-900 shadow-sm')
                    : (darkMode ? 'text-dark-400' : 'text-earth-600')
                }`}
              >
                Count
              </button>
            </div>
          </div>
        </div>
        
        {/* Filter Non-Response Toggle */}
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-dark-700' : 'border-earth-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeNonResponse}
              onChange={(e) => setExcludeNonResponse(e.target.checked)}
              className="w-4 h-4 rounded border-earth-300 text-forest-600 focus:ring-forest-500"
            />
            <span className={`text-sm ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
              Exclude non-responses (Don't know, Can't choose, Decline to answer, etc.)
            </span>
          </label>
        </div>
        
        {/* Country Selection */}
        <div className="mt-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
            Countries <span className={darkMode ? 'text-dark-500' : 'text-earth-500'}>(select up to 6)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {currentWave && Object.entries(currentWave.countries).map(([code, name]) => (
              <button
                key={code}
                onClick={() => toggleCountry(code)}
                className={`chip ${selectedCountries.includes(code) ? 'selected' : ''}`}
                style={selectedCountries.includes(code) ? { backgroundColor: countryColors[code], color: 'white' } : {}}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-display text-lg font-semibold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
            {variableInfo?.label || selectedVariable}
          </h3>
          <button
            onClick={exportChart}
            className={`btn btn-ghost flex items-center gap-2 ${darkMode ? 'text-dark-400 hover:text-dark-200' : ''}`}
          >
            <Download className="w-4 h-4" />
            Export Chart
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-[800px]">
            <div className="spinner" />
          </div>
        ) : formattedChartData.length > 0 ? (
          <div ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height={800}>
              <BarChart
                data={formattedChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={darkMode ? '#454655' : '#d4c5a9'} 
                  opacity={0.5} 
                />
                <XAxis 
                  dataKey="response" 
                  tick={<CustomXAxisTick />}
                  height={100}
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: darkMode ? '#b1b3be' : '#725845' }}
                  label={{ 
                    value: plotMetric === 'percent' ? 'Percentage (%)' : 'Weighted Count', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: darkMode ? '#b1b3be' : '#725845' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                {selectedCountryNames.map((name, index) => (
                  <Bar 
                    key={name}
                    dataKey={name}
                    fill={countryColors[selectedCountries[index]]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-[800px] ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
            Select a variable and countries to view the distribution
          </div>
        )}
      </div>
      
      {/* Data Tables */}
      {chartData?.data && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Percent Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display text-lg font-semibold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
                Percent Distribution
              </h3>
              <button
                onClick={() => exportTableCSV('percent')}
                className={`btn btn-ghost flex items-center gap-2 text-sm ${darkMode ? 'text-dark-400 hover:text-dark-200' : ''}`}
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Response</th>
                    {selectedCountryNames.map(name => (
                      <th key={name}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formattedChartData.map((row, i) => (
                    <tr key={i}>
                      <td className="font-medium">{row.response}</td>
                      {selectedCountryNames.map(name => (
                        <td key={name}>
                          {row[name] !== undefined ? `${row[name].toFixed(1)}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Count Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display text-lg font-semibold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
                Weighted Counts
              </h3>
              <button
                onClick={() => exportTableCSV('count')}
                className={`btn btn-ghost flex items-center gap-2 text-sm ${darkMode ? 'text-dark-400 hover:text-dark-200' : ''}`}
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Response</th>
                    {selectedCountryNames.map(name => (
                      <th key={name}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.data
                    .reduce((acc, item) => {
                      const label = item.response_label || item.response_value
                      if (excludeNonResponse && isNonResponse(item.response_value, label)) {
                        return acc
                      }
                      let row = acc.find(r => r.response === label)
                      if (!row) {
                        row = { response: label, order: item.response_value }
                        acc.push(row)
                      }
                      const countryName = currentWave?.countries[item.country_code]
                      if (countryName) {
                        row[countryName] = item.weighted_count
                      }
                      return acc
                    }, [])
                    .sort((a, b) => a.order - b.order)
                    .map((row, i) => (
                      <tr key={i}>
                        <td className="font-medium">{row.response}</td>
                        {selectedCountryNames.map(name => (
                          <td key={name}>
                            {row[name] !== undefined ? row[name].toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SingleVariableExplorer
