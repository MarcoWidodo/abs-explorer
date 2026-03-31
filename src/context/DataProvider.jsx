import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const DataContext = createContext()

const cache = {}

async function fetchJSON(path) {
  if (cache[path]) return cache[path]
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  const data = await res.json()
  cache[path] = data
  return data
}

export function DataProvider({ children }) {
  // Global data (loaded at startup)
  const [countryRegistry, setCountryRegistry] = useState(null)
  const [harmonization, setHarmonization] = useState(null)
  const [timeseries, setTimeseries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Per-wave data (loaded on demand)
  const [waveMetadata, setWaveMetadata] = useState({})
  const [waveDistributions, setWaveDistributions] = useState({})
  const [waveCorrelations, setWaveCorrelations] = useState({})

  // Load global data at startup
  useEffect(() => {
    async function init() {
      try {
        const [cr, harm, ts] = await Promise.all([
          fetchJSON('/data/country_registry.json'),
          fetchJSON('/data/harmonization.json'),
          fetchJSON('/data/harmonized_timeseries.json'),
        ])
        setCountryRegistry(cr)
        setHarmonization(harm)
        setTimeseries(ts)
      } catch (err) {
        console.error('Failed to load global data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Load wave metadata on demand
  const loadWaveMetadata = useCallback(async (waveNum) => {
    if (waveMetadata[waveNum]) return waveMetadata[waveNum]
    const data = await fetchJSON(`/data/wave${waveNum}_metadata.json`)
    setWaveMetadata(prev => ({ ...prev, [waveNum]: data }))
    return data
  }, [waveMetadata])

  // Load wave distributions on demand
  const loadWaveDistributions = useCallback(async (waveNum) => {
    if (waveDistributions[waveNum]) return waveDistributions[waveNum]
    const data = await fetchJSON(`/data/wave${waveNum}_distributions.json`)
    setWaveDistributions(prev => ({ ...prev, [waveNum]: data }))
    return data
  }, [waveDistributions])

  // Load wave correlations on demand
  const loadWaveCorrelations = useCallback(async (waveNum) => {
    if (waveCorrelations[waveNum]) return waveCorrelations[waveNum]
    const data = await fetchJSON(`/data/wave${waveNum}_correlations.json`)
    setWaveCorrelations(prev => ({ ...prev, [waveNum]: data }))
    return data
  }, [waveCorrelations])

  // Helper: get country display name
  const getCountryName = useCallback((code) => {
    if (!countryRegistry) return code
    return countryRegistry.countries?.[code]?.display_name || code
  }, [countryRegistry])

  // Helper: get country color CSS variable
  const getCountryColor = useCallback((code) => {
    return `var(--country-${code})`
  }, [])

  // Helper: list countries for a wave
  const getWaveCountries = useCallback((waveNum) => {
    if (!countryRegistry) return []
    return Object.entries(countryRegistry.countries)
      .filter(([, info]) => info.waves_present.includes(waveNum))
      .map(([code, info]) => ({ code, name: info.display_name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countryRegistry])

  return (
    <DataContext.Provider value={{
      // Global data
      countryRegistry,
      harmonization,
      timeseries,
      loading,
      error,

      // Per-wave loaders
      loadWaveMetadata,
      loadWaveDistributions,
      loadWaveCorrelations,

      // Per-wave cached data
      waveMetadata,
      waveDistributions,
      waveCorrelations,

      // Helpers
      getCountryName,
      getCountryColor,
      getWaveCountries,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useABSData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useABSData must be inside DataProvider')
  return ctx
}
