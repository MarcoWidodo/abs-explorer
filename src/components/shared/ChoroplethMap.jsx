import { useState, useMemo, memo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleSequential, scaleQuantile } from 'd3-scale'
import { interpolateYlOrRd, interpolateBlues, interpolateRdYlBu } from 'd3-scale-chromatic'

const GEO_URL = '/data/countries-50m.json'

// ISO numeric → alpha-2 mapping for ABS countries
const NUMERIC_TO_A2 = {
  '392': 'JP', '344': 'HK', '410': 'KR', '156': 'CN', '496': 'MN',
  '608': 'PH', '158': 'TW', '764': 'TH', '360': 'ID', '702': 'SG',
  '704': 'VN', '116': 'KH', '458': 'MY', '104': 'MM', '036': 'AU',
  '356': 'IN',
}

const COLOR_SCHEMES = {
  'Yellow → Red': interpolateYlOrRd,
  'Blues': interpolateBlues,
  'Diverging (Blue → Red)': interpolateRdYlBu,
}

function MapTooltip({ content, position }) {
  if (!content) return null
  return (
    <div
      className="map-tooltip"
      style={{ left: position.x, top: position.y }}
    >
      <div className="map-tooltip-name">{content.name}</div>
      {content.value != null ? (
        <>
          <div className="map-tooltip-value">Mean: {content.value.toFixed(2)}</div>
          <div className="map-tooltip-n">N = {content.n?.toLocaleString()}</div>
        </>
      ) : (
        <div className="map-tooltip-na">No data</div>
      )}
    </div>
  )
}

function ColorLegend({ scale, min, max, scheme }) {
  const steps = 6
  const values = Array.from({ length: steps + 1 }, (_, i) => min + (max - min) * (i / steps))

  return (
    <div className="map-legend">
      <div className="map-legend-bar">
        {Array.from({ length: 60 }, (_, i) => {
          const t = i / 59
          const val = min + (max - min) * t
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: '12px',
                background: scale(val),
              }}
            />
          )
        })}
      </div>
      <div className="map-legend-labels">
        <span>{min.toFixed(1)}</span>
        <span>{((min + max) / 2).toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  )
}

function CountryRanking({ data, getCountryName }) {
  const sorted = useMemo(() =>
    Object.entries(data)
      .filter(([cc, d]) => cc !== '_ALL' && d.mean != null)
      .sort(([, a], [, b]) => (b.mean ?? 0) - (a.mean ?? 0)),
    [data]
  )

  if (sorted.length === 0) return null

  return (
    <div className="map-ranking">
      <div className="detail-responses-label">Country Rankings</div>
      {sorted.map(([cc, d], i) => (
        <div key={cc} className="map-rank-row">
          <span className="map-rank-num">{i + 1}</span>
          <span className="stat-dot" style={{ background: `var(--country-${cc})` }} />
          <span className="map-rank-name">{getCountryName(cc)}</span>
          <span className="map-rank-value">{d.mean?.toFixed(2)}</span>
          <span className="map-rank-n">N={d.valid_n?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

const MemoizedGeographies = memo(function MemoizedGeographies({
  countryData, colorScale, absCountries, onHover, onLeave, onClick
}) {
  return (
    <Geographies geography={GEO_URL}>
      {({ geographies }) =>
        geographies.map(geo => {
          const numericId = geo.id
          const a2 = NUMERIC_TO_A2[numericId]
          const isABS = !!a2
          const data = a2 ? countryData[a2] : null
          const mean = data?.mean
          const hasData = mean != null

          let fill
          if (!isABS) {
            fill = 'var(--color-bg-muted)'
          } else if (!hasData) {
            fill = 'var(--color-bg-subtle)'
          } else {
            fill = colorScale(mean)
          }

          return (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill={fill}
              stroke={isABS ? 'var(--color-bg-raised)' : 'var(--color-border)'}
              strokeWidth={isABS ? 0.8 : 0.2}
              style={{
                default: { outline: 'none' },
                hover: {
                  outline: 'none',
                  fill: isABS && hasData ? fill : fill,
                  strokeWidth: isABS ? 1.5 : 0.2,
                  stroke: isABS ? 'var(--color-accent)' : 'var(--color-border)',
                  cursor: isABS ? 'pointer' : 'default',
                },
                pressed: { outline: 'none' },
              }}
              onMouseEnter={(e) => {
                if (isABS) {
                  onHover({
                    name: geo.properties.name,
                    value: mean,
                    n: data?.valid_n,
                    code: a2,
                  }, { x: e.clientX, y: e.clientY })
                }
              }}
              onMouseMove={(e) => {
                if (isABS) {
                  onHover({
                    name: geo.properties.name,
                    value: mean,
                    n: data?.valid_n,
                    code: a2,
                  }, { x: e.clientX, y: e.clientY })
                }
              }}
              onMouseLeave={onLeave}
            />
          )
        })
      }
    </Geographies>
  )
})

export default function ChoroplethMap({
  distributions,    // { JP: { mean, valid_n, ... }, KR: ... }
  colorScheme,      // key from COLOR_SCHEMES
  flipped,          // boolean — reverse gradient direction
  getCountryName,
}) {
  const [tooltip, setTooltip] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const scheme = COLOR_SCHEMES[colorScheme] || interpolateYlOrRd

  // Compute data extent for color scale
  const { colorScale, min, max } = useMemo(() => {
    if (!distributions) return { colorScale: () => '#ccc', min: 0, max: 1 }

    const means = Object.entries(distributions)
      .filter(([cc]) => cc !== '_ALL' && NUMERIC_TO_A2[cc] === undefined) // filter by a2 presence
      .map(([, d]) => d.mean)
      .filter(v => v != null)

    // Also check with a2 keys
    const a2Means = Object.entries(distributions)
      .filter(([cc]) => cc !== '_ALL')
      .map(([, d]) => d.mean)
      .filter(v => v != null)

    const allMeans = a2Means.length > 0 ? a2Means : means
    if (allMeans.length === 0) return { colorScale: () => '#ccc', min: 0, max: 1 }

    const mn = Math.floor(Math.min(...allMeans))
    const mx = Math.ceil(Math.max(...allMeans))
    const domain = mn === mx ? [mn - 0.5, mx + 0.5] : [mn, mx]

    const cs = scaleSequential(scheme).domain(flipped ? [domain[1], domain[0]] : domain)
    return { colorScale: cs, min: domain[0], max: domain[1] }
  }, [distributions, scheme, flipped])

  function handleHover(content, pos) {
    setTooltip(content)
    setTooltipPos(pos)
  }

  function handleLeave() {
    setTooltip(null)
  }

  return (
    <div className="map-wrap">
      <div className="map-container" style={{ position: 'relative' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [110, 10],
            scale: 340,
          }}
          width={800}
          height={500}
          style={{ width: '100%', height: 'auto', background: 'transparent' }}
        >
          <ZoomableGroup>
            <MemoizedGeographies
              countryData={distributions || {}}
              colorScale={colorScale}
              absCountries={NUMERIC_TO_A2}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          </ZoomableGroup>
        </ComposableMap>

        <MapTooltip content={tooltip} position={tooltipPos} />
      </div>

      <div className="map-bottom">
        <ColorLegend scale={colorScale} min={min} max={max} scheme={colorScheme} />
        {distributions && (
          <CountryRanking data={distributions} getCountryName={getCountryName} />
        )}
      </div>
    </div>
  )
}

export { COLOR_SCHEMES }
