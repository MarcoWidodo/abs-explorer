import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

const WAVE_LABELS = {
  wave1: 'Wave 1',
  wave2: 'Wave 2',
  wave3: 'Wave 3',
  wave4: 'Wave 4',
  wave5: 'Wave 5',
}

const WAVE_YEARS = {
  wave1: '2001–03',
  wave2: '2005–08',
  wave3: '2010–12',
  wave4: '2014–16',
  wave5: '2018–21',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginBottom: '0.3rem' }}>
        {WAVE_YEARS[Object.keys(WAVE_LABELS).find(k => WAVE_LABELS[k] === label)] || ''}
      </div>
      {payload
        .filter(e => e.value != null)
        .sort((a, b) => b.value - a.value)
        .map((entry, i) => (
          <div key={i} className="chart-tooltip-row">
            <span className="chart-tooltip-dot" style={{ background: entry.color }} />
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">{entry.value.toFixed(2)}</span>
          </div>
        ))}
    </div>
  )
}

function PctTooltip({ active, payload, label, responseLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginBottom: '0.3rem' }}>
        % responding "{responseLabel}"
      </div>
      {payload
        .filter(e => e.value != null)
        .sort((a, b) => b.value - a.value)
        .map((entry, i) => (
          <div key={i} className="chart-tooltip-row">
            <span className="chart-tooltip-dot" style={{ background: entry.color }} />
            <span className="chart-tooltip-name">{entry.name}</span>
            <span className="chart-tooltip-value">{entry.value.toFixed(1)}%</span>
          </div>
        ))}
    </div>
  )
}

export default function TimeSeriesChart({
  variableData,       // from harmonized_timeseries.json
  selectedCountries,
  getCountryName,
  mode,               // 'mean' or 'pct'
  selectedResponse,   // response code string for pct mode
}) {
  const waves = variableData?.waves || {}
  const wavesAvailable = variableData?.waves_available || []

  // Build chart data
  const chartData = useMemo(() => {
    return wavesAvailable.map(waveKey => {
      const row = { wave: WAVE_LABELS[waveKey] || waveKey, waveKey }
      const waveData = waves[waveKey]
      if (!waveData) return row

      for (const cc of selectedCountries) {
        const cd = waveData.countries?.[cc]
        if (!cd || cd.valid_n === 0) {
          row[cc] = null
          continue
        }

        if (mode === 'mean') {
          row[cc] = cd.mean
        } else {
          // pct mode — get percentage for selected response code
          row[cc] = cd.responses?.[selectedResponse]?.pct ?? null
        }
      }
      return row
    })
  }, [waves, wavesAvailable, selectedCountries, mode, selectedResponse])

  // Compute Y domain
  const yValues = chartData.flatMap(row =>
    selectedCountries.map(cc => row[cc]).filter(v => v != null)
  )
  const yMin = yValues.length > 0 ? Math.floor(Math.min(...yValues)) : 0
  const yMax = yValues.length > 0 ? Math.ceil(Math.max(...yValues)) : 5

  // Stats per country (latest available wave)
  const stats = useMemo(() => {
    return selectedCountries.map(cc => {
      // Find latest wave with data for this country
      for (let i = wavesAvailable.length - 1; i >= 0; i--) {
        const wk = wavesAvailable[i]
        const cd = waves[wk]?.countries?.[cc]
        if (cd && cd.valid_n > 0) {
          const val = mode === 'mean' ? cd.mean : cd.responses?.[selectedResponse]?.pct
          return { code: cc, value: val, n: cd.valid_n, wave: wk }
        }
      }
      return { code: cc, value: null, n: 0, wave: null }
    })
  }, [waves, wavesAvailable, selectedCountries, mode, selectedResponse])

  if (wavesAvailable.length === 0) {
    return <div className="chart-empty"><p>No time-series data available.</p></div>
  }

  const responseLabel = mode === 'pct' && variableData?.harmonized_labels?.[selectedResponse]
    ? variableData.harmonized_labels[selectedResponse]
    : selectedResponse

  return (
    <div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="wave"
              tick={{ fontSize: 12, fontFamily: 'var(--font-body)', fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              domain={[mode === 'pct' ? 0 : yMin - 0.5, mode === 'pct' ? 100 : yMax + 0.5]}
              allowDecimals={false}
              tickFormatter={(v) => mode === 'pct' ? `${Math.round(v)}%` : `${Math.round(v)}`}
            />
            <Tooltip
              content={mode === 'mean'
                ? <CustomTooltip />
                : <PctTooltip responseLabel={responseLabel} />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-body)' }}
              iconType="circle"
              iconSize={8}
            />
            {selectedCountries.map(cc => (
              <Line
                key={cc}
                type="monotone"
                dataKey={cc}
                name={getCountryName(cc)}
                stroke={`var(--country-${cc})`}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-bg-raised)' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        {stats.map(({ code, value, n, wave }) => (
          <div key={code} className="stat-card">
            <div className="stat-country">
              <span className="stat-dot" style={{ background: `var(--country-${code})` }} />
              {getCountryName(code)}
            </div>
            <div className="stat-values">
              {value != null ? (
                <span className="stat-mean">
                  {mode === 'mean' ? value.toFixed(2) : `${value.toFixed(1)}%`}
                </span>
              ) : (
                <span className="stat-na">N/A</span>
              )}
            </div>
            <div className="stat-n">
              {n > 0 ? `N = ${n.toLocaleString()} (${WAVE_LABELS[wave] || ''})` : 'No data'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
