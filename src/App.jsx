import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Header from './components/layout/Header'
import Dock from './components/layout/Dock'
import { useABSData } from './context/DataProvider'

const Home = lazy(() => import('./views/Home'))
const SingleWaveExplorer = lazy(() => import('./views/SingleWaveExplorer'))
const TimeSeriesExplorer = lazy(() => import('./views/TimeSeriesExplorer'))
const MapExplorer = lazy(() => import('./views/MapExplorer'))
const CorrelationsExplorer = lazy(() => import('./views/CorrelationsExplorer'))

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p className="loading-text">Loading survey data…</p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="loading-screen">
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)' }}>
        Unable to load data
      </h2>
      <p className="loading-text" style={{ maxWidth: 400, textAlign: 'center' }}>
        {message || 'Ensure JSON data files are in public/data/.'}
      </p>
    </div>
  )
}

function ViewFallback() {
  return (
    <div className="loading-screen" style={{ minHeight: '40vh' }}>
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  const { loading, error } = useABSData()

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<ViewFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<SingleWaveExplorer />} />
            <Route path="/trends" element={<TimeSeriesExplorer />} />
            <Route path="/map" element={<MapExplorer />} />
            <Route path="/correlations" element={<CorrelationsExplorer />} />
          </Routes>
        </Suspense>
      </main>
      <Dock />
    </>
  )
}
