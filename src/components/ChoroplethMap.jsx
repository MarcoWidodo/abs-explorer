import { useState, useMemo, memo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { scaleSequential, scaleQuantize } from 'd3-scale'
import { interpolateGreens, interpolateBlues, interpolateYlOrRd } from 'd3-scale-chromatic'

// Import the TopoJSON directly from world-atlas
import worldData from 'world-atlas/countries-50m.json'

// Map ABS country codes to ISO numeric codes used by world-atlas
const ABS_TO_ISO_NUMERIC = {
  1: "392",   // Japan
  2: "344",   // Hong Kong (special - handled separately)
  3: "410",   // South Korea
  4: "156",   // China
  5: "496",   // Mongolia
  6: "608",   // Philippines
  7: "158",   // Taiwan
  8: "764",   // Thailand
  9: "360",   // Indonesia
  10: "702",  // Singapore
  11: "704",  // Vietnam
  12: "116",  // Cambodia
  13: "458",  // Malaysia
  14: "104",  // Myanmar
  15: "036",  // Australia
  18: "356"   // India
}

// Reverse mapping
const ISO_NUMERIC_TO_ABS = Object.fromEntries(
  Object.entries(ABS_TO_ISO_NUMERIC).map(([k, v]) => [v, parseInt(k)])
)

// Country names for tooltips
const COUNTRY_NAMES = {
  1: "Japan", 2: "Hong Kong", 3: "South Korea", 4: "China",
  5: "Mongolia", 6: "Philippines", 7: "Taiwan", 8: "Thailand",
  9: "Indonesia", 10: "Singapore", 11: "Vietnam", 12: "Cambodia",
  13: "Malaysia", 14: "Myanmar", 15: "Australia", 18: "India"
}

// Color palette options
const COLOR_PALETTES = {
  greens: interpolateGreens,
  blues: interpolateBlues,
  heat: interpolateYlOrRd
}

const ChoroplethMap = memo(function ChoroplethMap({
  data = {},           // { absCode: { mean, proportion, n, name } }
  darkMode = false,
  displayType = 'mean', // 'mean' or 'proportion'
  scaleRange = [1, 5],
  colorPalette = 'greens',
  height = 400,
  onCountryHover = () => {},
  onCountryClick = () => {},
  showTooltip = true
}) {
  const [tooltipContent, setTooltipContent] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Color scale based on data
  const colorScale = useMemo(() => {
    const interpolator = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.greens
    
    if (displayType === 'mean') {
      return scaleSequential(interpolator).domain(scaleRange)
    } else {
      return scaleSequential(interpolator).domain([0, 100])
    }
  }, [displayType, scaleRange, colorPalette])
  
  // Get color for a country
  const getCountryColor = (isoNumeric) => {
    const absCode = ISO_NUMERIC_TO_ABS[isoNumeric]
    if (!absCode || !data[absCode]) {
      return darkMode ? '#2a2a2e' : '#e5e5e5' // No data color
    }
    
    const countryData = data[absCode]
    const value = displayType === 'mean' ? countryData.mean : countryData.proportion
    
    if (value === undefined || value === null) {
      return darkMode ? '#2a2a2e' : '#e5e5e5'
    }
    
    return colorScale(value)
  }
  
  // Check if country is in our ABS dataset
  const isABSCountry = (isoNumeric) => {
    return ISO_NUMERIC_TO_ABS[isoNumeric] !== undefined
  }
  
  // Handle mouse events
  const handleMouseEnter = (geo, evt) => {
    const isoNumeric = geo.id
    const absCode = ISO_NUMERIC_TO_ABS[isoNumeric]
    
    if (absCode && data[absCode]) {
      const countryData = data[absCode]
      setTooltipContent({
        name: countryData.name || COUNTRY_NAMES[absCode],
        value: displayType === 'mean' ? countryData.mean : countryData.proportion,
        n: countryData.n,
        displayType
      })
      onCountryHover(absCode, countryData)
    } else if (absCode) {
      setTooltipContent({
        name: COUNTRY_NAMES[absCode],
        value: null,
        n: null,
        displayType
      })
    }
  }
  
  const handleMouseMove = (evt) => {
    if (tooltipContent) {
      setTooltipPosition({ x: evt.clientX, y: evt.clientY })
    }
  }
  
  const handleMouseLeave = () => {
    setTooltipContent(null)
    onCountryHover(null, null)
  }
  
  return (
    <div 
      className="relative w-full" 
      style={{ height }}
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [115, 5],  // Center on Southeast Asia
          scale: 340
        }}
        style={{
          width: '100%',
          height: '100%',
          background: darkMode ? '#1a1a1f' : '#e8f4f8'
        }}
      >
        <ZoomableGroup>
          <Geographies geography={worldData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isoNumeric = geo.id
                const isHighlighted = isABSCountry(isoNumeric)
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryColor(isoNumeric)}
                    stroke={darkMode ? '#444' : '#999'}
                    strokeWidth={isHighlighted ? 0.8 : 0.3}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'fill 0.2s'
                      },
                      hover: {
                        outline: 'none',
                        fill: isHighlighted ? (darkMode ? '#4ade80' : '#166534') : undefined,
                        cursor: isHighlighted ? 'pointer' : 'default'
                      },
                      pressed: {
                        outline: 'none'
                      }
                    }}
                    onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      const absCode = ISO_NUMERIC_TO_ABS[isoNumeric]
                      if (absCode) onCountryClick(absCode, data[absCode])
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div
          className={`fixed z-50 px-3 py-2 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 ${
            darkMode ? 'bg-dark-800 text-dark-100 border border-dark-700' : 'bg-white text-earth-900 border border-earth-200'
          }`}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 60
          }}
        >
          <div className="font-semibold text-sm">{tooltipContent.name}</div>
          {tooltipContent.value !== null ? (
            <>
              <div className="text-sm">
                {tooltipContent.displayType === 'mean' 
                  ? `Mean: ${tooltipContent.value.toFixed(2)}`
                  : `${tooltipContent.value.toFixed(1)}%`
                }
              </div>
              <div className={`text-xs ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
                n = {tooltipContent.n?.toLocaleString()}
              </div>
            </>
          ) : (
            <div className={`text-xs ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
              No data for this wave
            </div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className={`absolute bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg ${
        darkMode ? 'bg-dark-800/95 border border-dark-700' : 'bg-white/95 border border-earth-200'
      }`}>
        <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-dark-300' : 'text-earth-600'}`}>
          {displayType === 'mean' ? 'Mean Value' : '% Selected Response'}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
            {displayType === 'mean' ? scaleRange[0] : '0%'}
          </span>
          <div 
            className="w-24 h-3 rounded"
            style={{
              background: `linear-gradient(to right, ${colorScale(displayType === 'mean' ? scaleRange[0] : 0)}, ${colorScale(displayType === 'mean' ? scaleRange[1] : 100)})`
            }}
          />
          <span className={`text-xs ${darkMode ? 'text-dark-400' : 'text-earth-500'}`}>
            {displayType === 'mean' ? scaleRange[1] : '100%'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div 
            className="w-4 h-3 rounded"
            style={{ background: darkMode ? '#2a2a2e' : '#e5e5e5' }}
          />
          <span className={`text-xs ${darkMode ? 'text-dark-500' : 'text-earth-400'}`}>
            No data
          </span>
        </div>
      </div>
    </div>
  )
})

export default ChoroplethMap
export { ABS_TO_ISO_NUMERIC, ISO_NUMERIC_TO_ABS, COUNTRY_NAMES }
