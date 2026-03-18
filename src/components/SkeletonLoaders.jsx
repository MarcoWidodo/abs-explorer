/**
 * SkeletonLoaders.jsx
 * Reusable skeleton loading components for perceived performance improvement
 * File location: src/components/SkeletonLoaders.jsx
 */

import { useTheme } from '../App'

// Chart skeleton - mimics a bar/line chart loading state
export function ChartSkeleton({ height = 'h-[300px] md:h-[500px] lg:h-[600px]' }) {
  const { darkMode } = useTheme()
  
  return (
    <div className={`${height} w-full flex flex-col`} role="status" aria-label="Loading chart">
      {/* Y-axis area */}
      <div className="flex h-full">
        <div className="w-12 flex flex-col justify-between py-4 pr-2">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`h-3 w-8 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        
        {/* Chart area */}
        <div className="flex-1 flex items-end gap-2 pb-8 px-4">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-t animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
              style={{ 
                height: `${30 + Math.random() * 60}%`,
                animationDelay: `${i * 75}ms`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex gap-2 px-16 mt-2">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className={`flex-1 h-3 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded animate-pulse ${darkMode ? 'bg-dark-600' : 'bg-earth-300'}`} />
            <div className={`w-16 h-3 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`} />
          </div>
        ))}
      </div>
      
      <span className="sr-only">Loading chart data...</span>
    </div>
  )
}

// Map skeleton - mimics a choropleth map loading
export function MapSkeleton({ height = 'h-[300px] md:h-[400px] lg:h-[450px]' }) {
  const { darkMode } = useTheme()
  
  return (
    <div className={`${height} w-full relative overflow-hidden rounded-xl`} role="status" aria-label="Loading map">
      {/* Map background */}
      <div className={`absolute inset-0 animate-pulse ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`} />
      
      {/* Fake country shapes */}
      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
        {[
          { x: 280, y: 60, w: 80, h: 100 },
          { x: 370, y: 80, w: 25, h: 50 },
          { x: 320, y: 180, w: 40, h: 60 },
          { x: 250, y: 200, w: 50, h: 40 },
          { x: 200, y: 220, w: 30, h: 25 },
          { x: 180, y: 180, w: 35, h: 50 },
          { x: 280, y: 260, w: 100, h: 35 },
          { x: 380, y: 280, w: 50, h: 25 },
        ].map((rect, i) => (
          <rect
            key={i}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            rx="4"
            className={`animate-pulse ${darkMode ? 'fill-dark-700' : 'fill-earth-200'}`}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </svg>
      
      {/* Legend skeleton */}
      <div className={`absolute bottom-4 right-4 p-3 rounded-lg ${darkMode ? 'bg-dark-900/90' : 'bg-white/90'}`}>
        <div className={`w-20 h-3 mb-2 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`} />
        <div className={`w-24 h-3 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`} />
      </div>
      
      <span className="sr-only">Loading map data...</span>
    </div>
  )
}

// Table skeleton - mimics a data table loading
export function TableSkeleton({ rows = 5, columns = 4 }) {
  const { darkMode } = useTheme()
  
  return (
    <div className="w-full" role="status" aria-label="Loading table">
      {/* Header */}
      <div className={`flex gap-4 p-4 border-b ${darkMode ? 'border-dark-700 bg-dark-800' : 'border-earth-200 bg-earth-50'}`}>
        {[...Array(columns)].map((_, i) => (
          <div 
            key={i} 
            className={`h-4 rounded animate-pulse ${darkMode ? 'bg-dark-600' : 'bg-earth-300'}`}
            style={{ width: `${60 + Math.random() * 40}px` }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div 
          key={rowIdx} 
          className={`flex gap-4 p-4 border-b ${darkMode ? 'border-dark-800' : 'border-earth-100'}`}
        >
          {[...Array(columns)].map((_, colIdx) => (
            <div 
              key={colIdx} 
              className={`h-3 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
              style={{ 
                width: `${40 + Math.random() * 60}px`,
                animationDelay: `${(rowIdx * columns + colIdx) * 50}ms`
              }}
            />
          ))}
        </div>
      ))}
      
      <span className="sr-only">Loading table data...</span>
    </div>
  )
}

// Card grid skeleton - for homepage or dashboard cards
export function CardGridSkeleton({ count = 4 }) {
  const { darkMode } = useTheme()
  
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading content">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className={`p-6 rounded-2xl border ${darkMode ? 'bg-dark-900 border-dark-800' : 'bg-white border-earth-100'}`}
        >
          <div 
            className={`w-12 h-12 rounded-xl mb-4 animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
            style={{ animationDelay: `${i * 100}ms` }}
          />
          <div 
            className={`h-5 w-3/4 rounded mb-2 animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
            style={{ animationDelay: `${i * 100 + 50}ms` }}
          />
          <div 
            className={`h-3 w-full rounded mb-1 animate-pulse ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`}
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          />
          <div 
            className={`h-3 w-2/3 rounded animate-pulse ${darkMode ? 'bg-dark-800' : 'bg-earth-100'}`}
            style={{ animationDelay: `${i * 100 + 150}ms` }}
          />
        </div>
      ))}
      
      <span className="sr-only">Loading content...</span>
    </div>
  )
}

// Scatter plot skeleton
export function ScatterSkeleton({ height = 'h-[300px] md:h-[450px] lg:h-[600px]' }) {
  const { darkMode } = useTheme()
  
  return (
    <div className={`${height} w-full flex`} role="status" aria-label="Loading scatter plot">
      {/* Y-axis */}
      <div className="w-16 flex flex-col justify-between py-8 pr-2 items-end">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className={`h-3 w-8 rounded animate-pulse ${darkMode ? 'bg-dark-700' : 'bg-earth-200'}`}
          />
        ))}
      </div>
      
      {/* Plot area */}
      <div className="flex-1 relative border-l border-b border-earth-300 dark:border-dark-600 mr-4 mb-8">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full animate-pulse ${darkMode ? 'bg-dark-600' : 'bg-earth-300'}`}
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 50}ms`
            }}
          />
        ))}
      </div>
      
      <span className="sr-only">Loading scatter plot data...</span>
    </div>
  )
}

export default {
  ChartSkeleton,
  MapSkeleton,
  TableSkeleton,
  CardGridSkeleton,
  ScatterSkeleton
}
