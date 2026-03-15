import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { Search, X, Info, TrendingUp, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { useData, useTheme } from '../App'
import { getCategoriesForWave, isHarmonizedVariable, getHarmonizedInfo } from '../variableConfig'

// Chart colors
const CHART_COLORS_LIGHT = [
  '#537963', '#8b6b50', '#e26d47', '#687891', '#9fb9a9',
  '#c2ab85', '#cf5431', '#354d40', '#b4956b', '#40604e',
  '#ed8e6f', '#725845', '#8795ab', '#5e493b', '#a7835f', '#2c3f35',
]

const CHART_COLORS_DARK = [
  '#6fcf97', '#f2c94c', '#f2994a', '#56ccf2', '#bb6bd9',
  '#eb5757', '#27ae60', '#9b51e0', '#2d9cdb', '#f2c94c',
  '#ff8a80', '#80cbc4', '#b39ddb', '#ffab91', '#a5d6a7', '#90caf9',
]

// Add jitter to a value - bounded within the cell
function jitter(value, amount = 0.35) {
  return value + (Math.random() - 0.5) * amount * 2
}

function CorrelationsExplorer() {
  const { metadata } = useData()
  const { darkMode } = useTheme()
  const chartContainerRef = useRef(null)
  
  const CHART_COLORS = darkMode ? CHART_COLORS_DARK : CHART_COLORS_LIGHT
  
  // State
  const [selectedWave, setSelectedWave] = useState('wave5')
  const [xVariable, setXVariable] = useState('')
  const [yVariable, setYVariable] = useState('')
  const [selectedCountries, setSelectedCountries] = useState([])
  const [showRegressionLine, setShowRegressionLine] = useState(true)
  const [scatterData, setScatterData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showXLabels, setShowXLabels] = useState(false)
  const [showYLabels, setShowYLabels] = useState(false)
  const [hoveredCell, setHoveredCell] = useState(null)
  
  // Search states
  const [xSearch, setXSearch] = useState('')
  const [ySearch, setYSearch] = useState('')
  const [showXDropdown, setShowXDropdown] = useState(false)
  const [showYDropdown, setShowYDropdown] = useState(false)
  const [expandedXCategory, setExpandedXCategory] = useState(null)
  const [expandedYCategory, setExpandedYCategory] = useState(null)
  
  // Get current wave data
  const currentWave = metadata?.[selectedWave]
  
  // Filter to scale variables (suitable for correlation)
  const scaleVariables = useMemo(() => {
    if (!currentWave) return []
    return Object.entries(currentWave.variables)
      .filter(([key, val]) => val.is_scale)
  }, [currentWave])
  
  // Get categorized variables
  const categorizedVariables = useMemo(() => {
    if (!currentWave) return {}
    return getCategoriesForWave(selectedWave, scaleVariables)
  }, [currentWave, selectedWave, scaleVariables])
  
  // Filter variables based on search
  const filterVariables = useCallback((search, vars) => {
    if (!search) return vars
    const searchLower = search.toLowerCase()
    return vars.filter(([key, val]) => 
      key.toLowerCase().includes(searchLower) || 
      val.label.toLowerCase().includes(searchLower)
    )
  }, [])
  
  // Set defaults when wave changes
  useEffect(() => {
    if (scaleVariables.length >= 2) {
      if (!xVariable || !scaleVariables.find(([k]) => k === xVariable)) {
        setXVariable(scaleVariables[0][0])
      }
      if (!yVariable || !scaleVariables.find(([k]) => k === yVariable)) {
        setYVariable(scaleVariables[1][0])
      }
    }
  }, [scaleVariables])
  
  // Set default countries when wave changes
  useEffect(() => {
    if (currentWave && selectedCountries.length === 0) {
      const countries = Object.keys(currentWave.countries).slice(0, 4)
      setSelectedCountries(countries)
    }
  }, [currentWave])
  
  // Reset when wave changes
  useEffect(() => {
    if (currentWave) {
      const countries = Object.keys(currentWave.countries).slice(0, 4)
      setSelectedCountries(countries)
    }
  }, [selectedWave])
  
  // Fetch scatter data
  useEffect(() => {
    if (!xVariable || !yVariable || selectedCountries.length === 0) return
    
    setLoading(true)
    fetch(`/api/correlation?wave=${selectedWave}&x=${xVariable}&y=${yVariable}&countries=${selectedCountries.join(',')}`)
      .then(res => res.json())
      .then(data => {
        setScatterData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch correlation data:', err)
        setLoading(false)
      })
  }, [selectedWave, xVariable, yVariable, selectedCountries])
  
  // Get variable info
  const xInfo = currentWave?.variables[xVariable]
  const yInfo = currentWave?.variables[yVariable]
  
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
    } else if (selectedCountries.length < 8) {
      setSelectedCountries([...selectedCountries, code])
    }
  }
  
  // Get unique x and y values for discrete axes
  const axisValues = useMemo(() => {
    if (!scatterData?.data) return { x: [], y: [] }
    const xSet = new Set()
    const ySet = new Set()
    scatterData.data.forEach(d => {
      xSet.add(d.x_value)
      ySet.add(d.y_value)
    })
    return {
      x: Array.from(xSet).sort((a, b) => a - b),
      y: Array.from(ySet).sort((a, b) => a - b)
    }
  }, [scatterData])
  
  // Process scatter data for chart - create jittered points within cell bounds
  const processedData = useMemo(() => {
    if (!scatterData?.data) return { points: [], cells: {} }
    
    const allPoints = []
    const cellData = {} // Store aggregated data for each cell
    
    scatterData.data.forEach(d => {
      if (!selectedCountries.includes(d.country_code.toString())) return
      
      const cellKey = `${d.x_value}-${d.y_value}`
      const countryCode = d.country_code.toString()
      
      // Initialize cell data
      if (!cellData[cellKey]) {
        cellData[cellKey] = {
          x: d.x_value,
          y: d.y_value,
          countries: {}
        }
      }
      
      // Add to cell country counts
      if (!cellData[cellKey].countries[countryCode]) {
        cellData[cellKey].countries[countryCode] = {
          name: currentWave?.countries[countryCode] || countryCode,
          color: countryColors[countryCode],
          count: 0
        }
      }
      cellData[cellKey].countries[countryCode].count += d.count
      
      // Create jittered points (limit to reasonable number per cell/country)
      const numPoints = Math.min(Math.ceil(Math.sqrt(d.count)), 15)
      for (let i = 0; i < numPoints; i++) {
        allPoints.push({
          x: jitter(d.x_value, 0.35),
          y: jitter(d.y_value, 0.35),
          cellX: d.x_value,
          cellY: d.y_value,
          cellKey,
          countryCode,
          color: countryColors[countryCode]
        })
      }
    })
    
    return { points: allPoints, cells: cellData }
  }, [scatterData, selectedCountries, currentWave, countryColors])
  
  // Calculate combined statistics for all selected countries
  const combinedStats = useMemo(() => {
    if (!scatterData?.statistics) return null
    
    let totalN = 0
    const allData = scatterData.data?.filter(d => selectedCountries.includes(d.country_code.toString())) || []
    
    if (allData.length < 3) return null
    
    let n = 0, sX = 0, sY = 0, sXY = 0, sX2 = 0, sY2 = 0
    
    allData.forEach(d => {
      const count = d.count || 1
      n += count
      sX += d.x_value * count
      sY += d.y_value * count
      sXY += d.x_value * d.y_value * count
      sX2 += d.x_value * d.x_value * count
      sY2 += d.y_value * d.y_value * count
    })
    
    if (n < 3) return null
    
    const meanX = sX / n
    const meanY = sY / n
    const varX = (sX2 / n) - (meanX * meanX)
    const varY = (sY2 / n) - (meanY * meanY)
    const covXY = (sXY / n) - (meanX * meanY)
    
    const correlation = varX > 0 && varY > 0 ? covXY / Math.sqrt(varX * varY) : null
    const slope = varX > 0 ? covXY / varX : null
    const intercept = slope !== null ? meanY - slope * meanX : null
    const rSquared = correlation !== null ? correlation * correlation : null
    
    return {
      n,
      correlation: isNaN(correlation) ? null : correlation,
      r_squared: isNaN(rSquared) ? null : rSquared,
      slope: isNaN(slope) ? null : slope,
      intercept: isNaN(intercept) ? null : intercept,
      mean_x: meanX,
      mean_y: meanY
    }
  }, [scatterData, selectedCountries])
  
  // Custom tooltip for cell hover
  const CellTooltip = ({ cell }) => {
    if (!cell) return null
    
    const totalCount = Object.values(cell.countries).reduce((sum, c) => sum + c.count, 0)
    
    return (
      <div className={`p-3 rounded-lg shadow-lg border ${darkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-earth-200'}`}>
        <div className={`font-medium mb-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          ({cell.x}, {cell.y})
        </div>
        <div className={`text-sm mb-2 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>
          Total: {totalCount.toLocaleString()} observations
        </div>
        <div className="space-y-1">
          {Object.entries(cell.countries).map(([code, data]) => (
            <div key={code} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                <span className={darkMode ? 'text-dark-300' : 'text-earth-700'}>{data.name}</span>
              </span>
              <span className={`font-medium ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
                {data.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Export chart as PNG with title and legend
  const exportChart = async () => {
    if (!chartContainerRef.current) return
    
    // Create a canvas to combine title, chart, and legend
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Get the SVG from the chart
    const svgElement = chartContainerRef.current.querySelector('svg')
    if (!svgElement) return
    
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const img = new Image()
    
    img.onload = () => {
      const padding = 40
      const titleHeight = 60
      const legendHeight = 80
      
      canvas.width = (img.width + padding * 2) * 2
      canvas.height = (img.height + titleHeight + legendHeight + padding * 2) * 2
      ctx.scale(2, 2)
      
      // Background
      ctx.fillStyle = darkMode ? '#131316' : '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Title
      ctx.fillStyle = darkMode ? '#ececef' : '#32261f'
      ctx.font = 'bold 16px "DM Sans", sans-serif'
      ctx.textAlign = 'center'
      const title = `${xInfo?.label || xVariable} vs ${yInfo?.label || yVariable}`
      const maxWidth = img.width + padding
      
      // Wrap title text
      const words = title.split(' ')
      let line = ''
      let y = padding + 20
      const lineHeight = 22
      
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
        ctx.beginPath()
        ctx.arc(x + 8, legendY, 6, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = darkMode ? '#b1b3be' : '#725845'
        ctx.font = '12px "DM Sans", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(currentWave?.countries[code] || code, x + 20, legendY + 4)
      })
      
      const link = document.createElement('a')
      link.download = `${xVariable}_vs_${yVariable}_scatter.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }
  
  // Export statistics as CSV
  const exportStatsCSV = () => {
    if (!scatterData?.statistics) return
    
    const headers = ['Country', 'N', 'Correlation (r)', 'R²', 'Slope', 'Intercept', 'p-value']
    const rows = []
    
    Object.entries(scatterData.statistics)
      .filter(([code]) => selectedCountries.includes(code))
      .forEach(([code, stats]) => {
        rows.push([
          currentWave?.countries[code] || code,
          stats.n || '',
          stats.correlation?.toFixed(4) || '',
          stats.r_squared?.toFixed(4) || '',
          stats.slope?.toFixed(4) || '',
          stats.intercept?.toFixed(4) || '',
          stats.p_value?.toFixed(4) || ''
        ].join(','))
      })
    
    if (combinedStats) {
      rows.push([
        'All Selected Countries',
        combinedStats.n || '',
        combinedStats.correlation?.toFixed(4) || '',
        combinedStats.r_squared?.toFixed(4) || '',
        combinedStats.slope?.toFixed(4) || '',
        combinedStats.intercept?.toFixed(4) || '',
        'N/A'
      ].join(','))
    }
    
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${xVariable}_vs_${yVariable}_statistics.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
  }
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.variable-dropdown-x')) {
        setShowXDropdown(false)
      }
      if (!e.target.closest('.variable-dropdown-y')) {
        setShowYDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Variable selector component with categories
  const VariableSelector = ({ 
    label, 
    value, 
    setValue, 
    search, 
    setSearch, 
    showDropdown, 
    setShowDropdown,
    info,
    showLabels,
    setShowLabels,
    expandedCategory,
    setExpandedCategory,
    dropdownClass
  }) => {
    const filteredCategories = useMemo(() => {
      const result = {}
      for (const [cat, data] of Object.entries(categorizedVariables)) {
        const filtered = filterVariables(search, data.variables)
        if (filtered.length > 0) {
          result[cat] = { ...data, variables: filtered }
        }
      }
      return result
    }, [search])
    
    return (
      <div className={`flex-1 ${dropdownClass}`}>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
          {label}
        </label>
        <div className="relative">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-dark-400' : 'text-earth-400'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                e.stopPropagation()
                setSearch(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={(e) => {
                e.stopPropagation()
                setShowDropdown(true)
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search variables..."
              className="input pl-10 pr-10"
            />
            {search && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSearch('')
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-dark-400 hover:text-dark-200' : 'text-earth-400 hover:text-earth-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {showDropdown && (
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
                  
                  {(expandedCategory === category || search) && (
                    <div>
                      {data.variables.map(([key, val]) => (
                        <button
                          key={key}
                          onClick={(e) => {
                            e.stopPropagation()
                            setValue(key)
                            setSearch('')
                            setShowDropdown(false)
                          }}
                          className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                            value === key 
                              ? (darkMode ? 'bg-forest-900/30 text-forest-300' : 'bg-forest-50 text-forest-700')
                              : (darkMode ? 'hover:bg-dark-800' : 'hover:bg-earth-50')
                          }`}
                        >
                          <span className={`font-mono text-xs mr-2 ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>{key}</span>
                          <span className={darkMode ? 'text-dark-200' : 'text-earth-800'}>
                            {val.label.slice(0, 50)}{val.label.length > 50 ? '...' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {value && info && !showDropdown && (
          <div className={`mt-2 p-3 rounded-lg ${darkMode ? 'bg-dark-800/50' : 'bg-earth-50'}`}>
            <div className="flex items-start gap-2">
              <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>{value}</span>
                  {isHarmonizedVariable(selectedWave, value) && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-forest-900/50 text-forest-400' : 'bg-forest-100 text-forest-700'}`}>
                      Harmonized
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>{info.label}</p>
                
                {info.value_labels && Object.keys(info.value_labels).length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowLabels(!showLabels)}
                      className={`flex items-center gap-1 text-xs ${darkMode ? 'text-forest-400 hover:text-forest-300' : 'text-forest-600 hover:text-forest-700'}`}
                    >
                      {showLabels ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showLabels ? 'Hide' : 'Show'} value labels
                    </button>
                    
                    {showLabels && (
                      <div className={`mt-2 p-2 rounded text-xs space-y-1 max-h-32 overflow-y-auto ${darkMode ? 'bg-dark-900' : 'bg-white'}`}>
                        {Object.entries(info.value_labels)
                          .filter(([code]) => {
                            const c = parseInt(code)
                            return c > 0 && c < 90
                          })
                          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                          .map(([code, label]) => (
                            <div key={code} className="flex gap-2">
                              <span className={`font-mono font-medium ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>{code}:</span>
                              <span className={darkMode ? 'text-dark-300' : 'text-earth-700'}>{label}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // Get axis range for regression line
  const xRange = useMemo(() => {
    if (!axisValues.x.length) return [0, 5]
    return [Math.min(...axisValues.x) - 0.5, Math.max(...axisValues.x) + 0.5]
  }, [axisValues])
  
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className={`font-display text-2xl md:text-3xl font-bold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
          Correlations Explorer
        </h1>
        <p className={darkMode ? 'text-dark-400' : 'text-earth-600'}>
          Analyze relationships between survey variables across countries
        </p>
      </div>
      
      {/* Controls */}
      <div className="card p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
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
          
          {/* Variable Selectors */}
          <VariableSelector
            label="X-Axis Variable"
            value={xVariable}
            setValue={setXVariable}
            search={xSearch}
            setSearch={setXSearch}
            showDropdown={showXDropdown}
            setShowDropdown={setShowXDropdown}
            info={xInfo}
            showLabels={showXLabels}
            setShowLabels={setShowXLabels}
            expandedCategory={expandedXCategory}
            setExpandedCategory={setExpandedXCategory}
            dropdownClass="variable-dropdown-x"
          />
          
          <VariableSelector
            label="Y-Axis Variable"
            value={yVariable}
            setValue={setYVariable}
            search={ySearch}
            setSearch={setYSearch}
            showDropdown={showYDropdown}
            setShowDropdown={setShowYDropdown}
            info={yInfo}
            showLabels={showYLabels}
            setShowLabels={setShowYLabels}
            expandedCategory={expandedYCategory}
            setExpandedCategory={setExpandedYCategory}
            dropdownClass="variable-dropdown-y"
          />
        </div>
        
        {/* Regression Options */}
        <div className={`flex flex-wrap gap-4 mb-4 pt-4 border-t ${darkMode ? 'border-dark-700' : 'border-earth-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRegressionLine}
              onChange={(e) => setShowRegressionLine(e.target.checked)}
              className="w-4 h-4 rounded border-earth-300 text-forest-600 focus:ring-forest-500"
            />
            <span className={`text-sm ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>Show regression lines</span>
          </label>
        </div>
        
        {/* Country Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
            Countries <span className={darkMode ? 'text-dark-500' : 'text-earth-500'}>(select up to 8)</span>
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
      
      {/* Scatter Plot */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-4">
            <h3 className={`font-display text-lg font-semibold leading-tight ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
              {xInfo?.label || xVariable}
              <span className={`mx-2 ${darkMode ? 'text-dark-500' : 'text-earth-400'}`}>vs</span>
              {yInfo?.label || yVariable}
            </h3>
          </div>
          <button
            onClick={exportChart}
            className={`btn btn-ghost flex items-center gap-2 flex-shrink-0 ${darkMode ? 'text-dark-400 hover:text-dark-200' : ''}`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="spinner" />
          </div>
        ) : processedData.points.length > 0 ? (
          <div ref={chartContainerRef} className="relative">
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={darkMode ? '#454655' : '#d4c5a9'} 
                  opacity={0.5} 
                />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={xVariable}
                  domain={[Math.min(...axisValues.x) - 0.5, Math.max(...axisValues.x) + 0.5]}
                  ticks={axisValues.x}
                  tick={{ fontSize: 11, fill: darkMode ? '#b1b3be' : '#725845' }}
                  label={{ 
                    value: xInfo?.label?.slice(0, 80) || xVariable, 
                    position: 'bottom',
                    offset: 60,
                    style: { 
                      fontSize: 11, 
                      fill: darkMode ? '#b1b3be' : '#725845',
                      textAnchor: 'middle'
                    }
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={yVariable}
                  domain={[Math.min(...axisValues.y) - 0.5, Math.max(...axisValues.y) + 0.5]}
                  ticks={axisValues.y}
                  tick={{ fontSize: 11, fill: darkMode ? '#b1b3be' : '#725845' }}
                  width={50}
                  label={{ 
                    value: yInfo?.label?.slice(0, 60) || yVariable, 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -45,
                    style: { 
                      fontSize: 11, 
                      fill: darkMode ? '#b1b3be' : '#725845',
                      textAnchor: 'middle'
                    }
                  }}
                />
                
                {/* Regression lines */}
                {showRegressionLine && scatterData?.statistics && selectedCountries.map(code => {
                  const stats = scatterData.statistics[code]
                  if (!stats?.slope || !stats?.intercept) return null
                  
                  const y1 = stats.slope * xRange[0] + stats.intercept
                  const y2 = stats.slope * xRange[1] + stats.intercept
                  
                  return (
                    <ReferenceLine
                      key={`reg-${code}`}
                      segment={[
                        { x: xRange[0], y: y1 },
                        { x: xRange[1], y: y2 }
                      ]}
                      stroke={countryColors[code]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )
                })}
                
                {/* Scatter points */}
                <Scatter 
                  data={processedData.points} 
                  isAnimationActive={false}
                >
                  {processedData.points.map((point, index) => (
                    <Cell 
                      key={index} 
                      fill={point.color}
                      fillOpacity={hoveredCell === point.cellKey ? 0.9 : 0.5}
                      onMouseEnter={() => setHoveredCell(point.cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* Custom tooltip */}
            {hoveredCell && processedData.cells[hoveredCell] && (
              <div 
                className="absolute pointer-events-none"
                style={{ 
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <CellTooltip cell={processedData.cells[hoveredCell]} />
              </div>
            )}
            
            {/* Legend - positioned below chart */}
            <div className="flex justify-center flex-wrap gap-4 mt-4 pt-4">
              {selectedCountries.map(code => (
                <div key={code} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: countryColors[code] }}
                  />
                  <span className={`text-sm ${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
                    {currentWave?.countries[code]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-[600px] ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
            Select variables and countries to view the scatter plot
          </div>
        )}
      </div>
      
      {/* Statistics Table */}
      {scatterData?.statistics && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-display text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
              <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
              Correlation Statistics
            </h3>
            <button
              onClick={exportStatsCSV}
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
                  <th>Country</th>
                  <th>N</th>
                  <th>Correlation (r)</th>
                  <th>R²</th>
                  <th>Slope</th>
                  <th>Intercept</th>
                  <th>p-value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(scatterData.statistics)
                  .filter(([code]) => selectedCountries.includes(code))
                  .map(([code, stats]) => (
                    <tr key={code}>
                      <td className="font-medium">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: countryColors[code] }}
                        />
                        {currentWave?.countries[code]}
                      </td>
                      <td>{stats.n?.toLocaleString() || '—'}</td>
                      <td className={`font-mono ${
                        stats.correlation > 0.3 ? (darkMode ? 'text-green-400' : 'text-forest-600') : 
                        stats.correlation < -0.3 ? (darkMode ? 'text-red-400' : 'text-terra-600') : ''
                      }`}>
                        {stats.correlation?.toFixed(3) || '—'}
                      </td>
                      <td className="font-mono">{stats.r_squared?.toFixed(3) || '—'}</td>
                      <td className="font-mono">{stats.slope?.toFixed(3) || '—'}</td>
                      <td className="font-mono">{stats.intercept?.toFixed(3) || '—'}</td>
                      <td className={`font-mono ${stats.p_value < 0.05 ? (darkMode ? 'text-green-400 font-medium' : 'text-forest-600 font-medium') : ''}`}>
                        {stats.p_value < 0.001 ? '< 0.001' : stats.p_value?.toFixed(3) || '—'}
                      </td>
                    </tr>
                  ))}
                
                {/* Combined row */}
                {combinedStats && (
                  <tr className={darkMode ? 'bg-dark-800/50' : 'bg-earth-50'}>
                    <td className="font-semibold">All Selected Countries</td>
                    <td className="font-semibold">{combinedStats.n?.toLocaleString() || '—'}</td>
                    <td className={`font-mono font-semibold ${
                      combinedStats.correlation > 0.3 ? (darkMode ? 'text-green-400' : 'text-forest-600') : 
                      combinedStats.correlation < -0.3 ? (darkMode ? 'text-red-400' : 'text-terra-600') : ''
                    }`}>
                      {combinedStats.correlation?.toFixed(3) || '—'}
                    </td>
                    <td className="font-mono font-semibold">{combinedStats.r_squared?.toFixed(3) || '—'}</td>
                    <td className="font-mono font-semibold">{combinedStats.slope?.toFixed(3) || '—'}</td>
                    <td className="font-mono font-semibold">{combinedStats.intercept?.toFixed(3) || '—'}</td>
                    <td className="font-mono">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className={`text-sm mt-4 ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>
            Note: Statistics are calculated using weighted data with non-response values excluded.
          </p>
        </div>
      )}
    </div>
  )
}

export default CorrelationsExplorer
