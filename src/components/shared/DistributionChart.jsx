import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <span className="chart-tooltip-value">{entry.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function DistributionChart({
  distributions,     // { JP: { responses: { "1": { pct, count }, ... }, mean, valid_n }, ... }
  responseOptions,    // { "1": { label: "Very good", is_substantive: true }, ... }
  selectedCountries,  // ["JP", "KR", "TW", "TH"]
  getCountryName,     // code → display name
  excludeNonResponse, // boolean
}) {
  // Build chart data: one entry per response option, with country pcts as fields
  const chartData = useMemo(() => {
    if (!distributions || !responseOptions) return []

    const codes = Object.entries(responseOptions)
      .filter(([, info]) => excludeNonResponse ? info.is_substantive : true)
      .sort(([a], [b]) => Number(a) - Number(b))

    return codes.map(([code, info]) => {
      const row = {
        code,
        label: info.label || `Code ${code}`,
        is_substantive: info.is_substantive,
      }
      for (const cc of selectedCountries) {
        const countryDist = distributions[cc]
        if (countryDist?.responses?.[code]) {
          row[cc] = countryDist.responses[code].pct
        } else {
          row[cc] = 0
        }
      }
      return row
    })
  }, [distributions, responseOptions, selectedCountries, excludeNonResponse])

  // Summary stats
  const stats = useMemo(() => {
    if (!distributions) return []
    return selectedCountries.map(cc => {
      const d = distributions[cc]
      if (!d) return { code: cc, mean: null, n: 0 }
      return {
        code: cc,
        mean: d.mean,
        std: d.std,
        n: d.valid_n || 0,
      }
    })
  }, [distributions, selectedCountries])

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available for this selection.</p>
      </div>
    )
  }

  // Truncate long labels for x-axis
  function formatLabel(label) {
    return label.length > 25 ? label.slice(0, 22) + '…' : label
  }

  return (
    <div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            barCategoryGap="18%"
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tickFormatter={formatLabel}
              tick={{ fontSize: 12, fontFamily: 'var(--font-body)', fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
              interval={0}
              angle={chartData.length > 6 ? -30 : 0}
              textAnchor={chartData.length > 6 ? 'end' : 'middle'}
              height={chartData.length > 6 ? 70 : 40}
            />
            <YAxis
              tick={{ fontSize: 12, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v)}`}
              allowDecimals={false}
              domain={[0, 'auto']}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-subtle)', opacity: 0.5 }} />
            <Legend
              wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-body)' }}
              iconType="circle"
              iconSize={8}
            />
            {selectedCountries.map(cc => (
              <Bar
                key={cc}
                dataKey={cc}
                name={getCountryName(cc)}
                fill={`var(--country-${cc})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats row */}
      <div className="stats-row">
        {stats.map(({ code, mean, std, n }) => (
          <div key={code} className="stat-card">
            <div className="stat-country">
              <span className="stat-dot" style={{ background: `var(--country-${code})` }} />
              {getCountryName(code)}
            </div>
            <div className="stat-values">
              {mean != null ? (
                <>
                  <span className="stat-mean">{mean.toFixed(2)}</span>
                  {std != null && <span className="stat-std">± {std.toFixed(2)}</span>}
                </>
              ) : (
                <span className="stat-na">N/A</span>
              )}
            </div>
            <div className="stat-n">N = {n.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
