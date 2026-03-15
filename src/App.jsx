import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Sun, Moon, BarChart3, ScatterChart, Home, Menu, X, TrendingUp, Map } from 'lucide-react'
import SingleVariableExplorer from './pages/SingleVariableExplorer'
import CorrelationsExplorer from './pages/CorrelationsExplorer'
import TimeSeriesExplorer from './pages/TimeSeriesExplorer'
import MapExplorer from './pages/MapExplorer'
import HomePage from './pages/HomePage'

// Theme context
const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

// Data context
const DataContext = createContext()
export const useData = () => useContext(DataContext)

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return JSON.parse(saved)
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  
  // Cache for distribution data
  const distributionCache = useRef({})
  
  // Load metadata on mount
  useEffect(() => {
    fetch('/api/metadata')
      .then(res => res.json())
      .then(data => {
        setMetadata(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load metadata:', err)
        setLoading(false)
      })
  }, [])
  
  // Distribution loader function
  const loadDistribution = useCallback(async (wave, variable, countries = null) => {
    const cacheKey = `${wave}:${variable}:${countries ? countries.sort().join(',') : 'all'}`
    
    // Return cached data if available
    if (distributionCache.current[cacheKey]) {
      return distributionCache.current[cacheKey]
    }
    
    // Build URL
    let url = `/api/distribution?wave=${wave}&variable=${variable}`
    if (countries && countries.length > 0) {
      url += `&countries=${countries.join(',')}`
    }
    
    try {
      const res = await fetch(url)
      const data = await res.json()
      
      // Transform data into our expected format: { countryCode: { responseValue: { weighted: count } } }
      const transformed = {}
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          const code = item.country_code
          if (!transformed[code]) transformed[code] = {}
          transformed[code][item.response_value] = {
            weighted: item.weighted_count,
            unweighted: item.unweighted_count || item.weighted_count
          }
        }
      }
      
      // Cache the result
      distributionCache.current[cacheKey] = transformed
      return transformed
    } catch (err) {
      console.error('Failed to load distribution:', err)
      return null
    }
  }, [])
  
  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])
  
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/single-variable', icon: BarChart3, label: 'Single Variable' },
    { to: '/correlations', icon: ScatterChart, label: 'Correlations' },
    { to: '/time-series', icon: TrendingUp, label: 'Time Series' },
    { to: '/map', icon: Map, label: 'Map Explorer' },
  ]
  
  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <DataContext.Provider value={{ metadata, loading, loadDistribution }}>
        <div className="min-h-screen bg-earth-50 dark:bg-dark-950 transition-colors duration-300">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-earth-200 dark:border-dark-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <NavLink to="/" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 flex items-center justify-center shadow-lg group-hover:shadow-forest-500/25 transition-shadow">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="font-display font-semibold text-earth-900 dark:text-earth-100 text-lg leading-tight">
                      Asian Barometer
                    </h1>
                    <p className="text-xs text-earth-500 dark:text-earth-400 -mt-0.5">Survey Explorer</p>
                  </div>
                </NavLink>
                
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-forest-600 text-white shadow-md'
                            : 'text-earth-600 dark:text-dark-400 hover:bg-earth-100 dark:hover:bg-dark-800 hover:text-earth-900 dark:hover:text-dark-100'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </NavLink>
                  ))}
                </nav>
                
                {/* Right side controls */}
                <div className="flex items-center gap-3">
                  {/* Theme toggle */}
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2.5 rounded-lg bg-earth-100 dark:bg-dark-800 text-earth-600 dark:text-dark-400 hover:bg-earth-200 dark:hover:bg-dark-700 transition-colors"
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2.5 rounded-lg bg-earth-100 dark:bg-dark-800 text-earth-600 dark:text-dark-400"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-earth-200 dark:border-dark-800 bg-white dark:bg-dark-900 animate-fade-in">
                <nav className="px-4 py-3 space-y-1">
                  {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                          isActive
                            ? 'bg-forest-600 text-white'
                            : 'text-earth-600 dark:text-dark-400 hover:bg-earth-100 dark:hover:bg-dark-800'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </header>
          
          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="spinner" />
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/single-variable" element={<SingleVariableExplorer />} />
                <Route path="/correlations" element={<CorrelationsExplorer />} />
                <Route path="/time-series" element={<TimeSeriesExplorer />} />
                <Route path="/map" element={<MapExplorer />} />
              </Routes>
            )}
          </main>
          
          {/* Footer */}
          <footer className="border-t border-earth-200 dark:border-dark-800 py-6 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-earth-500 dark:text-dark-500">
              Asian Barometer Survey Explorer • Data from ABS Waves 1-5 (2001-2021)
            </div>
          </footer>
        </div>
      </DataContext.Provider>
    </ThemeContext.Provider>
  )
}

export default App
