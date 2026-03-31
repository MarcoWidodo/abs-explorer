import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'

/* ── Statistics helpers ── */

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + p * ax)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return 0.5 * (1 + sign * y)
}

function pearsonP(r, n) {
  if (n < 4 || Math.abs(r) >= 1) return Math.abs(r) >= 1 ? 0 : 1
  const z = 0.5 * Math.log((1 + r) / (1 - r))
  const se = 1 / Math.sqrt(n - 3)
  return 2 * (1 - normalCDF(Math.abs(z / se)))
}

export function computeRegression(points) {
  const n = points.length
  if (n < 3) return null

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = sumY / n - slope * (sumX / n)

  // Pearson r
  const rNum = n * sumXY - sumX * sumY
  const rDen = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  const r = rDen === 0 ? 0 : rNum / rDen
  const p = pearsonP(r, n)

  return { slope, intercept, r, p, n }
}

/* ── Custom dot: country-colored circle + code label ── */

function CountryDot({ cx, cy, payload }) {
  if (!cx || !cy) return null
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={7}
        fill={`var(--country-${payload.code})`}
        stroke="var(--color-bg-raised)"
        strokeWidth={2}
      />
      <text
        x={cx} y={cy - 13}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="var(--color-text-secondary)"
      >
        {payload.code}
      </text>
    </g>
  )
}

/* ── Custom tooltip ── */

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="chart-tooltip-dot" style={{ background: `var(--country-${d.code})` }} />
        {d.name}
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-name">{d.xLabel}:</span>
        <span className="chart-tooltip-value">{d.x.toFixed(2)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-name">{d.yLabel}:</span>
        <span className="chart-tooltip-value">{d.y.toFixed(2)}</span>
      </div>
    </div>
  )
}

/* ── ScatterPlot component ── */

export default function ScatterPlot({
  data,         // [{ code, name, x, y, xLabel, yLabel }]
  xLabel,       // "q7 — Trust in president"
  yLabel,       // "q8 — Trust in courts"
}) {
  const regression = useMemo(() => computeRegression(data), [data])

  // Axis domains with padding
  const { xDomain, yDomain, regSegment } = useMemo(() => {
    if (data.length === 0) return { xDomain: [0, 5], yDomain: [0, 5], regSegment: null }

    const xs = data.map(d => d.x)
    const ys = data.map(d => d.y)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const xPad = (xMax - xMin) * 0.15 || 0.5
    const yPad = (yMax - yMin) * 0.15 || 0.5

    const xd = [Math.floor((xMin - xPad) * 10) / 10, Math.ceil((xMax + xPad) * 10) / 10]
    const yd = [Math.floor((yMin - yPad) * 10) / 10, Math.ceil((yMax + yPad) * 10) / 10]

    let seg = null
    if (regression) {
      const { slope, intercept } = regression
      seg = [
        { x: xd[0], y: slope * xd[0] + intercept },
        { x: xd[1], y: slope * xd[1] + intercept },
      ]
    }

    return { xDomain: xd, yDomain: yd, regSegment: seg }
  }, [data, regression])

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No countries with valid means for both variables.</p>
      </div>
    )
  }

  // Format p-value
  function fmtP(p) {
    if (p < 0.001) return '< 0.001'
    return p.toFixed(3)
  }

  return (
    <div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 35 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              tick={{ fontSize: 12, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-tertiary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            >
              <Label
                value={xLabel}
                position="bottom"
                offset={10}
                style={{ fontSize: 11, fontFamily: 'var(--font-body)', fill: 'var(--color-text-secondary)' }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              tick={{ fontSize: 12, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(1)}
            >
              <Label
                value={yLabel}
                angle={-90}
                position="insideLeft"
                offset={5}
                style={{ fontSize: 11, fontFamily: 'var(--font-body)', fill: 'var(--color-text-secondary)', textAnchor: 'middle' }}
              />
            </YAxis>
            <Tooltip content={<ScatterTooltip />} cursor={false} />

            {/* Regression line */}
            {regSegment && (
              <ReferenceLine
                segment={regSegment}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            )}

            <Scatter
              data={data}
              shape={<CountryDot />}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Regression stats */}
      {regression && (
        <div className="scatter-stats">
          <div className="scatter-stat">
            <span className="scatter-stat-label">Pearson r</span>
            <span className="scatter-stat-value">{regression.r.toFixed(3)}</span>
          </div>
          <div className="scatter-stat">
            <span className="scatter-stat-label">p-value</span>
            <span className="scatter-stat-value">{fmtP(regression.p)}</span>
          </div>
          <div className="scatter-stat">
            <span className="scatter-stat-label">R²</span>
            <span className="scatter-stat-value">{(regression.r * regression.r).toFixed(3)}</span>
          </div>
          <div className="scatter-stat">
            <span className="scatter-stat-label">N (countries)</span>
            <span className="scatter-stat-value">{regression.n}</span>
          </div>
        </div>
      )}
    </div>
  )
}
