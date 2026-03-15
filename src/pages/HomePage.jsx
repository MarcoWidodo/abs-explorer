import { NavLink } from 'react-router-dom'
import { BarChart3, ScatterChart, Globe, TrendingUp, Map, ChevronRight, X, Info, Users } from 'lucide-react'
import { useData, useTheme } from '../App'
import { useState, useEffect, useMemo } from 'react'
import ChoroplethMap from '../components/ChoroplethMap'
import { isNonResponse } from '../variableConfig'

const COUNTRIES_DATA = {
  1: { name: "Japan", waves: [1,2,3,4,5] },
  2: { name: "Hong Kong", waves: [1,2,3,4,5] },
  3: { name: "South Korea", waves: [1,2,3,4,5] },
  4: { name: "China", waves: [1,2,3,4,5] },
  5: { name: "Mongolia", waves: [1,2,3,4,5] },
  6: { name: "Philippines", waves: [1,2,3,4,5] },
  7: { name: "Taiwan", waves: [1,2,3,4,5] },
  8: { name: "Thailand", waves: [1,2,3,4,5] },
  9: { name: "Indonesia", waves: [2,3,4,5] },
  10: { name: "Singapore", waves: [2,3,4,5] },
  11: { name: "Vietnam", waves: [2,3,4,5] },
  12: { name: "Cambodia", waves: [2,3,4] },
  13: { name: "Malaysia", waves: [2,3,4,5] },
  14: { name: "Myanmar", waves: [3,4,5] },
  15: { name: "Australia", waves: [4] },
  18: { name: "India", waves: [4,5] }
}

const FEATURED_VARIABLES = [
  { id: 'q1', label: 'National Economic Condition', wave: 'wave5' },
  { id: 'q99', label: 'Satisfaction with Democracy', wave: 'wave5' },
  { id: 'q22', label: 'Interpersonal Trust', wave: 'wave5' },
  { id: 'q7', label: 'Trust in Courts', wave: 'wave5' },
]

function HomePage() {
  const { metadata, loadDistribution } = useData()
  const { darkMode } = useTheme()
  const [animatedStats, setAnimatedStats] = useState({ respondents: 0, countries: 0, waves: 0 })
  const [showCoverageModal, setShowCoverageModal] = useState(false)
  const [selectedMapVar, setSelectedMapVar] = useState(FEATURED_VARIABLES[0])
  const [mapData, setMapData] = useState({})
  const [loadingMap, setLoadingMap] = useState(false)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  
  const totalRespondents = metadata
    ? Object.values(metadata).reduce((sum, wave) => sum + wave.n_respondents, 0)
    : 0
  const totalCountries = Object.keys(COUNTRIES_DATA).length
  
  // Animate stats
  useEffect(() => {
    const duration = 1500, steps = 60, interval = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const easeOut = 1 - Math.pow(1 - step / steps, 3)
      setAnimatedStats({
        respondents: Math.floor(totalRespondents * easeOut),
        countries: Math.floor(totalCountries * easeOut),
        waves: Math.floor(5 * easeOut)
      })
      if (step >= steps) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [totalRespondents, totalCountries])
  
  // Load map data
  useEffect(() => {
    if (!loadDistribution || !selectedMapVar || !metadata) return
    setLoadingMap(true)
    
    loadDistribution(selectedMapVar.wave, selectedMapVar.id)
      .then(data => {
        if (!data) { setMapData({}); setLoadingMap(false); return }
        
        const varInfo = metadata[selectedMapVar.wave]?.variables[selectedMapVar.id]
        const processed = {}
        
        for (const [countryCode, responses] of Object.entries(data)) {
          const code = parseInt(countryCode)
          let totalWeight = 0, weightedSum = 0
          
          for (const [respValue, count] of Object.entries(responses)) {
            const numResp = parseInt(respValue)
            const valueLabel = varInfo?.value_labels?.[numResp] || ''
            if (isNonResponse(numResp, valueLabel)) continue
            const weight = count.weighted || count
            totalWeight += weight
            weightedSum += numResp * weight
          }
          
          if (totalWeight > 0) {
            processed[code] = {
              mean: weightedSum / totalWeight,
              n: Math.round(totalWeight),
              name: COUNTRIES_DATA[code]?.name || `Country ${code}`
            }
          }
        }
        
        setMapData(processed)
        setLoadingMap(false)
      })
      .catch(() => { setMapData({}); setLoadingMap(false) })
  }, [selectedMapVar, loadDistribution, metadata])
  
  const features = [
    { to: '/single-variable', icon: BarChart3, title: 'Single Variable', description: 'Explore distributions across countries', color: 'forest' },
    { to: '/correlations', icon: ScatterChart, title: 'Correlations', description: 'Analyze variable relationships', color: 'terra' },
    { to: '/time-series', icon: TrendingUp, title: 'Time Series', description: 'Track changes across waves', color: 'forest' },
    { to: '/map', icon: Map, title: 'Map Explorer', description: 'Geographic visualization', color: 'terra' },
  ]
  
  const waveInfo = [
    { wave: 1, years: "2001-03", countries: 8 },
    { wave: 2, years: "2005-08", countries: 13 },
    { wave: 3, years: "2010-12", countries: 13 },
    { wave: 4, years: "2014-16", countries: 14 },
    { wave: 5, years: "2018-21", countries: 14 }
  ]
  
  return (
    <div className="animate-fade-in">
      {/* Hero with Interactive Map */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Left: Title and Stats */}
        <div className="flex flex-col justify-center">
          <h1 className={`font-display text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
            Asian Barometer
            <span className={`block ${darkMode ? 'text-forest-400' : 'text-forest-600'}`}>Survey Explorer</span>
          </h1>
          <p className={`text-lg mb-8 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>
            Two decades of public opinion data across Asia-Pacific. Explore democratic values, institutional trust, and social attitudes.
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Respondents', value: animatedStats.respondents.toLocaleString(), color: 'forest' },
              { label: 'Countries', value: animatedStats.countries, color: 'terra' },
              { label: 'Waves', value: animatedStats.waves, color: 'forest' }
            ].map(stat => (
              <div key={stat.label} className={`text-center p-4 rounded-xl ${darkMode ? 'bg-dark-800/50' : 'bg-white/80'} backdrop-blur-sm shadow-sm`}>
                <div className={`font-display text-2xl md:text-3xl font-bold ${stat.color === 'forest' ? (darkMode ? 'text-forest-400' : 'text-forest-600') : (darkMode ? 'text-terra-400' : 'text-terra-600')}`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>{stat.label}</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setShowCoverageModal(true)}
            className={`flex items-center gap-2 text-sm ${darkMode ? 'text-forest-400 hover:text-forest-300' : 'text-forest-600 hover:text-forest-700'}`}
          >
            <Info className="w-4 h-4" /> View detailed country coverage by wave
          </button>
        </div>
        
        {/* Right: Interactive Map */}
        <div className={`card p-4 ${darkMode ? 'bg-dark-800/50' : 'bg-white/90'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-display text-lg font-semibold ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
              <Globe className={`inline w-5 h-5 mr-2 ${darkMode ? 'text-forest-400' : 'text-forest-600'}`} />
              Live Data Preview
            </h3>
            <div className="select-wrapper" style={{ minWidth: '200px' }}>
              <select
                value={FEATURED_VARIABLES.findIndex(v => v.id === selectedMapVar.id)}
                onChange={(e) => setSelectedMapVar(FEATURED_VARIABLES[parseInt(e.target.value)])}
                className="text-sm py-1"
              >
                {FEATURED_VARIABLES.map((v, i) => (
                  <option key={v.id} value={i}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {loadingMap ? (
            <div className="flex items-center justify-center h-[350px]"><div className="spinner" /></div>
          ) : (
            <div className="rounded-xl overflow-hidden">
              <ChoroplethMap
                data={mapData}
                darkMode={darkMode}
                displayType="mean"
                scaleRange={[1, 5]}
                height={350}
                onCountryHover={(code, data) => setHoveredCountry(data ? { code, ...data } : null)}
              />
            </div>
          )}
          
          <NavLink to="/map" className={`mt-3 flex items-center justify-center gap-2 text-sm font-medium ${darkMode ? 'text-forest-400 hover:text-forest-300' : 'text-forest-600 hover:text-forest-700'}`}>
            Explore full map <ChevronRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>
      
      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {features.map((feature) => (
          <NavLink
            key={feature.to}
            to={feature.to}
            className={`group card p-6 transition-all hover:scale-[1.02] hover:shadow-lg ${darkMode ? 'hover:border-forest-700' : 'hover:border-forest-300'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              feature.color === 'forest' ? (darkMode ? 'bg-forest-900/50 text-forest-400' : 'bg-forest-100 text-forest-600') : (darkMode ? 'bg-terra-900/50 text-terra-400' : 'bg-terra-100 text-terra-600')
            }`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className={`font-display text-lg font-semibold mb-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>{feature.title}</h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>{feature.description}</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${feature.color === 'forest' ? (darkMode ? 'text-forest-400' : 'text-forest-600') : (darkMode ? 'text-terra-400' : 'text-terra-600')}`}>
              Explore <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </NavLink>
        ))}
      </div>
      
      {/* Survey Waves */}
      <div className="card p-6 mb-12">
        <h2 className={`font-display text-xl font-semibold mb-6 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>Survey Waves</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {waveInfo.map((w, i) => (
            <div key={w.wave} className={`p-4 rounded-xl text-center ${darkMode ? 'bg-dark-800' : 'bg-earth-50'}`}>
              <div className={`font-display text-2xl font-bold mb-1 ${i % 2 === 0 ? (darkMode ? 'text-forest-400' : 'text-forest-600') : (darkMode ? 'text-terra-400' : 'text-terra-600')}`}>
                Wave {w.wave}
              </div>
              <div className={`text-sm ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>{w.years}</div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-dark-500' : 'text-earth-500'}`}>{w.countries} countries</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* About */}
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-dark-800/50' : 'bg-earth-50'}`}>
        <h2 className={`font-display text-xl font-semibold mb-4 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>About</h2>
        <p className={`${darkMode ? 'text-dark-300' : 'text-earth-700'}`}>
          The Asian Barometer Survey (ABS) is a comparative survey of attitudes and values toward politics, governance, democracy, and economic reform across Asia-Pacific. Starting in 2001, it provides longitudinal data enabling researchers to track changes in public opinion over two decades.
        </p>
      </div>
      
      {/* Coverage Modal */}
      {showCoverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCoverageModal(false)}>
          <div className={`card p-6 max-w-4xl max-h-[80vh] overflow-auto ${darkMode ? 'bg-dark-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-display text-xl font-semibold flex items-center gap-2 ${darkMode ? 'text-dark-100' : 'text-earth-900'}`}>
                <Users className="w-5 h-5" /> Country Coverage by Wave
              </h2>
              <button onClick={() => setShowCoverageModal(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-dark-800' : 'hover:bg-earth-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 mb-4 min-w-max">
                <div className={`w-28 flex-shrink-0 text-sm font-medium ${darkMode ? 'text-dark-400' : 'text-earth-600'}`}>Country</div>
                {waveInfo.map(w => (
                  <div key={w.wave} className={`w-20 text-center text-xs ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
                    <div className="font-semibold">W{w.wave}</div>
                    <div>{w.years}</div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-1">
                {Object.entries(COUNTRIES_DATA)
                  .sort((a, b) => b[1].waves.length - a[1].waves.length)
                  .map(([code, data]) => (
                    <div key={code} className={`flex items-center gap-2 py-2 px-2 rounded-lg ${darkMode ? 'hover:bg-dark-800' : 'hover:bg-earth-50'}`}>
                      <div className={`w-28 flex-shrink-0 text-sm font-medium ${darkMode ? 'text-dark-200' : 'text-earth-800'}`}>{data.name}</div>
                      {[1,2,3,4,5].map(wave => (
                        <div key={wave} className="w-20 flex justify-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                            data.waves.includes(wave)
                              ? (darkMode ? 'bg-forest-700 text-forest-200' : 'bg-forest-200 text-forest-800')
                              : (darkMode ? 'bg-dark-800 text-dark-600' : 'bg-earth-100 text-earth-300')
                          }`}>
                            {data.waves.includes(wave) ? '✓' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
