import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Download, Filter, Layers3, Search, X, Check, RotateCcw } from 'lucide-react'
import { useTheme } from '../App'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : ''

const COUNTRY_COLORS = {
  Japan: '#B91C1C',
  'Hong Kong': '#0F766E',
  'South Korea': '#1D4ED8',
  China: '#A16207',
  Mongolia: '#7C3AED',
  Philippines: '#EA580C',
  Taiwan: '#BE185D',
  Thailand: '#15803D',
  Indonesia: '#0E7490',
  Singapore: '#2563EB',
  Vietnam: '#DB2777',
  Cambodia: '#CA8A04',
  Malaysia: '#4B5563',
  Myanmar: '#7C2D12',
  Australia: '#0369A1',
  India: '#EA580C',
}

function formatWaveLabel(waveKey, waveInfo) {
  const info = waveInfo?.[waveKey]
  if (!info) return waveKey
  return `${waveKey} (${info.years})`
}

function truncateText(text, max = 96) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function LoadingCard() {
  return (
    <div className="card p-6 space-y-4 animate-pulse">
      <div className="h-7 w-60 rounded bg-earth-200 dark:bg-dark-700" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-4 w-24 rounded bg-earth-200 dark:bg-dark-700" />
            <div className="h-10 w-full rounded bg-earth-100 dark:bg-dark-800" />
          </div>
        ))}
      </div>
      <div className="h-[360px] rounded-xl bg-earth-100 dark:bg-dark-800" />
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="card p-8 text-center border-dashed border-earth-200 dark:border-dark-700">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-earth-100 dark:bg-dark-800 text-earth-500 dark:text-dark-400">
        <Layers3 className="h-5 w-5" />
      </div>
      <h3 className="font-medium text-earth-900 dark:text-dark-100">{title}</h3>
      <p className="mt-1 text-sm text-earth-600 dark:text-dark-400">{description}</p>
    </div>
  )
}

function CustomTooltip({ active, payload, label, waveInfo }) {
  if (!active || !payload?.length) return null

  const rows = payload
    .filter((entry) => entry?.value != null)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="max-w-xs rounded-xl border border-earth-200 bg-white p-3 shadow-xl dark:border-dark-700 dark:bg-dark-900">
      <div className="mb-2 text-sm font-semibold text-earth-900 dark:text-dark-100">
        {formatWaveLabel(label, waveInfo)}
      </div>
      <div className="space-y-1">
        {rows.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="min-w-0 flex-1 truncate text-earth-600 dark:text-dark-400">{entry.name}</span>
            <span className="font-mono font-semibold text-earth-900 dark:text-dark-100">
              {Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TimeSeriesExplorer() {
  const { darkMode } = useTheme()

  const [catalog, setCatalog] = useState({ categories: [], variables: [], waveInfo: {} })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [selectedVariable, setSelectedVariable] = useState('')
  const [selectedCountries, setSelectedCountries] = useState([])
  const [chartData, setChartData] = useState(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const hasAutoSelectedCountries = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        const response = await fetch(`${API_BASE}/api/timeseries`)
        if (!response.ok) {
          throw new Error(`Failed to load catalog (${response.status})`)
        }
        const data = await response.json()
        if (cancelled) return

        setCatalog({
          categories: data.categories || [],
          variables: data.variables || [],
          waveInfo: data.waveInfo || {},
        })

        const firstCategory = (data.categories || [])[0]?.name || (data.variables || [])[0]?.category || ''
        setSelectedCategory(firstCategory)
        setLoadingCatalog(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoadingCatalog(false)
        }
      }
    }

    loadCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  const categoryOptions = catalog.categories || []
  const allVariables = catalog.variables || []

  const selectedCategoryMeta = useMemo(
    () => categoryOptions.find((category) => category.name === selectedCategory) || null,
    [categoryOptions, selectedCategory]
  )

  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return []
    if (selectedCategoryMeta?.subcategories) return selectedCategoryMeta.subcategories
    const subcats = new Set(
      allVariables.filter((variable) => variable.category === selectedCategory).map((variable) => variable.subcategory).filter(Boolean)
    )
    return Array.from(subcats)
  }, [allVariables, selectedCategory, selectedCategoryMeta])

  const filteredVariables = useMemo(() => {
    return allVariables
      .filter((variable) => (selectedCategory ? variable.category === selectedCategory : true))
      .filter((variable) => (selectedSubcategory ? variable.subcategory === selectedSubcategory : true))
      .filter((variable) => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
          variable.id?.toLowerCase().includes(term) ||
          variable.label?.toLowerCase().includes(term) ||
          variable.question?.toLowerCase().includes(term) ||
          variable.subcategory?.toLowerCase().includes(term)
        )
      })
      .sort((a, b) => (a.label || a.question || '').localeCompare(b.label || b.question || '', undefined, { numeric: true }))
  }, [allVariables, selectedCategory, selectedSubcategory, searchTerm])

  useEffect(() => {
    setSelectedSubcategory('')
    setSelectedVariable('')
    setChartData(null)
    setShowTable(false)
  }, [selectedCategory])

  useEffect(() => {
    setSelectedVariable('')
    setChartData(null)
    setShowTable(false)
  }, [selectedSubcategory])

  useEffect(() => {
    if (!selectedVariable && filteredVariables.length > 0) {
      setSelectedVariable(filteredVariables[0].id)
    }
  }, [filteredVariables, selectedVariable])

  const fetchTimeSeries = useCallback(
    async (variableId, countryCodes) => {
      if (!variableId) return

      setLoadingData(true)
      try {
        const params = new URLSearchParams({ variableId })
        if (countryCodes?.length) {
          params.set('countries', countryCodes.join(','))
        }

        const response = await fetch(`${API_BASE}/api/timeseries?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`Failed to load time series (${response.status})`)
        }
        const data = await response.json()
        setChartData(data)

        if (!hasAutoSelectedCountries.current && data?.lineData?.length) {
          setSelectedCountries(data.lineData.map((row) => row.countryCode))
          hasAutoSelectedCountries.current = true
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingData(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!selectedVariable) return
    fetchTimeSeries(selectedVariable, selectedCountries)
  }, [fetchTimeSeries, selectedVariable, selectedCountries])

  const currentVariable = useMemo(
    () => allVariables.find((variable) => variable.id === selectedVariable) || null,
    [allVariables, selectedVariable]
  )

  const allCountryRows = useMemo(() => chartData?.lineData || [], [chartData])

  const visibleCountries = useMemo(() => {
    if (!allCountryRows.length || !selectedCountries.length) return []
    return allCountryRows.filter((row) => selectedCountries.includes(row.countryCode))
  }, [allCountryRows, selectedCountries])

  const chartRows = useMemo(() => {
    if (!chartData?.variable?.waves?.length || !visibleCountries.length) return []
    return chartData.variable.waves.map((waveKey) => {
      const row = { wave: waveKey }
      visibleCountries.forEach((countryRow) => {
        if (countryRow[waveKey] != null) {
          row[countryRow.country] = countryRow[waveKey]
        }
      })
      return row
    })
  }, [chartData, visibleCountries])

  const countries = useMemo(() => {
    return allCountryRows.map((row) => ({
      code: row.countryCode,
      name: row.country,
      selected: selectedCountries.includes(row.countryCode),
    }))
  }, [allCountryRows, selectedCountries])

  const yDomain = useMemo(() => {
    const values = chartRows.flatMap((row) =>
      Object.entries(row)
        .filter(([key, value]) => key !== 'wave' && typeof value === 'number' && Number.isFinite(value))
        .map(([, value]) => value)
    )

    if (!values.length) return ['auto', 'auto']

    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return [Math.max(0, min - 1), max + 1]
    return [min, max]
  }, [chartRows])

  const exportCSV = useCallback(() => {
    if (!chartData?.lineData?.length || !chartData?.variable?.waves?.length) return

    const waves = chartData.variable.waves
    const headers = ['Country', 'Country Code', ...waves.map((wave) => `${wave} Mean`), ...waves.map((wave) => `${wave} N`)]
    const rows = chartData.lineData
      .filter((row) => selectedCountries.includes(row.countryCode))
      .map((row) => [
        row.country,
        row.countryCode,
        ...waves.map((wave) => (row[wave] != null ? row[wave] : '')),
        ...waves.map((wave) => (row[`${wave}_n`] != null ? row[`${wave}_n`] : '')),
      ])

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `abs_timeseries_${selectedVariable}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [chartData, selectedCountries, selectedVariable])

  const toggleCountry = useCallback((code) => {
    hasAutoSelectedCountries.current = true
    setSelectedCountries((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code]
    )
  }, [])

  const selectAllCountries = useCallback(() => {
    if (!chartData?.lineData?.length) return
    hasAutoSelectedCountries.current = true
    setSelectedCountries(chartData.lineData.map((row) => row.countryCode))
  }, [chartData])

  const clearCountries = useCallback(() => {
    hasAutoSelectedCountries.current = true
    setSelectedCountries([])
  }, [])

  if (loadingCatalog) {
    return <LoadingCard />
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-earth-900 dark:text-dark-100 md:text-3xl">
          Time-Series Explorer
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-earth-600 dark:text-dark-400">
          Compare harmonized survey variables across ABS waves. Choose a category, narrow to a variable, and inspect trends across countries.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="card space-y-5 p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
              Category
            </label>
            <div className="select-wrapper">
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {categoryOptions.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
              Subcategory
            </label>
            <div className="select-wrapper">
              <select
                value={selectedSubcategory}
                onChange={(event) => setSelectedSubcategory(event.target.value)}
              >
                <option value="">All subcategories</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
              Search variables
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-earth-400 dark:text-dark-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by variable, label, or question"
                className="w-full rounded-xl border border-earth-200 bg-white py-2.5 pl-9 pr-3 text-sm text-earth-900 outline-none transition placeholder:text-earth-400 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-100 dark:placeholder:text-dark-500"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
                Variables ({filteredVariables.length})
              </label>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-earth-500 hover:text-earth-700 dark:text-dark-400 dark:hover:text-dark-200"
              >
                Clear search
              </button>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredVariables.map((variable) => {
                const active = selectedVariable === variable.id
                return (
                  <button
                    key={variable.id}
                    type="button"
                    onClick={() => setSelectedVariable(variable.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-forest-500 bg-forest-50 shadow-sm dark:border-forest-400 dark:bg-forest-950/40'
                        : 'border-earth-200 bg-white hover:border-forest-300 hover:bg-earth-50 dark:border-dark-700 dark:bg-dark-900 dark:hover:border-forest-600 dark:hover:bg-dark-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
                          {variable.id}
                        </div>
                        <div className="mt-1 text-sm font-medium text-earth-900 dark:text-dark-100">
                          {variable.label || variable.question}
                        </div>
                      </div>
                      {active ? <Check className="mt-0.5 h-4 w-4 text-forest-600 dark:text-forest-400" /> : null}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-earth-600 dark:text-dark-400">
                      {truncateText(variable.question, 120)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-earth-500 dark:text-dark-400">
                      {variable.subcategory ? (
                        <span className="rounded-full bg-earth-100 px-2 py-1 dark:bg-dark-800">{variable.subcategory}</span>
                      ) : null}
                      <span className="rounded-full bg-earth-100 px-2 py-1 dark:bg-dark-800">
                        {variable.scalePoints}-point scale
                      </span>
                    </div>
                  </button>
                )
              })}
              {!filteredVariables.length ? (
                <EmptyState
                  title="No variables match this filter"
                  description="Try a different category, subcategory, or search term."
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {currentVariable ? (
            <div className="card space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
                    <Filter className="h-3.5 w-3.5" />
                    {currentVariable.category}
                    {currentVariable.subcategory ? <span className="text-earth-300 dark:text-dark-600">•</span> : null}
                    {currentVariable.subcategory || null}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-earth-900 dark:text-dark-100 md:text-xl">
                    {currentVariable.label || currentVariable.question}
                  </h2>
                  <p className="mt-1 max-w-4xl text-sm text-earth-600 dark:text-dark-400">
                    {currentVariable.question}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!chartData?.lineData?.length}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-earth-50 p-3 dark:bg-dark-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">Scale</div>
                  <div className="mt-1 text-sm text-earth-900 dark:text-dark-100">
                    {currentVariable.scalePoints}-point scale
                  </div>
                </div>
                <div className="rounded-xl bg-earth-50 p-3 dark:bg-dark-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">Waves</div>
                  <div className="mt-1 text-sm text-earth-900 dark:text-dark-100">
                    {currentVariable.waves?.map((wave) => wave).join(', ') || 'None'}
                  </div>
                </div>
                <div className="rounded-xl bg-earth-50 p-3 dark:bg-dark-800/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">Countries selected</div>
                  <div className="mt-1 text-sm text-earth-900 dark:text-dark-100">
                    {selectedCountries.length || 0}
                  </div>
                </div>
              </div>

              {currentVariable.notes ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                  {currentVariable.notes}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-earth-900 dark:text-dark-100">Country filters</h3>
                <p className="text-sm text-earth-600 dark:text-dark-400">Select which countries should appear in the chart.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllCountries}
                  className="rounded-lg border border-earth-200 px-3 py-2 text-sm text-earth-700 transition hover:bg-earth-50 dark:border-dark-700 dark:text-dark-300 dark:hover:bg-dark-800"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearCountries}
                  className="inline-flex items-center gap-2 rounded-lg border border-earth-200 px-3 py-2 text-sm text-earth-700 transition hover:bg-earth-50 dark:border-dark-700 dark:text-dark-300 dark:hover:bg-dark-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear all
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {countries.length > 0 ? (
                countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => toggleCountry(country.code)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      country.selected
                        ? 'text-white shadow-sm'
                        : 'bg-earth-100 text-earth-600 hover:bg-earth-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                    }`}
                    style={country.selected ? { backgroundColor: COUNTRY_COLORS[country.name] || '#4B5563' } : undefined}
                  >
                    {country.name}
                    {country.selected ? <X className="h-3.5 w-3.5" /> : null}
                  </button>
                ))
              ) : (
                <div className="text-sm text-earth-500 dark:text-dark-400">
                  No countries selected. Use Select all or click individual country chips.
                </div>
              )}
            </div>
          </div>

          {loadingData ? (
            <div className="card p-5">
              <LoadingCard />
            </div>
          ) : selectedCountries.length === 0 ? (
            <EmptyState
              title="No countries selected"
              description="Choose one or more countries to display the time series chart."
            />
          ) : chartRows.length > 0 ? (
            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-earth-900 dark:text-dark-100">Time series chart</h3>
                  <p className="text-sm text-earth-600 dark:text-dark-400">
                    Country means by wave for the selected variable.
                  </p>
                </div>
              </div>

              <div className="h-[340px] sm:h-[400px] lg:h-[460px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 10, right: 18, bottom: 8, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis
                      dataKey="wave"
                      tick={{ fontSize: 12, fill: darkMode ? '#CBD5E1' : '#475569' }}
                      axisLine={{ stroke: darkMode ? '#64748B' : '#CBD5E1' }}
                      tickLine={{ stroke: darkMode ? '#64748B' : '#CBD5E1' }}
                      tickFormatter={(waveKey) => waveKey}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: 12, fill: darkMode ? '#CBD5E1' : '#475569' }}
                      axisLine={{ stroke: darkMode ? '#64748B' : '#CBD5E1' }}
                      tickLine={{ stroke: darkMode ? '#64748B' : '#CBD5E1' }}
                      label={{
                        value: 'Mean',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 4,
                        style: {
                          fill: darkMode ? '#CBD5E1' : '#475569',
                          fontSize: 12,
                        },
                      }}
                    />
                    <Tooltip content={<CustomTooltip waveInfo={catalog.waveInfo} />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {visibleCountries.map((country) => (
                      <Line
                        key={country.countryCode}
                        type="monotone"
                        dataKey={country.country}
                        name={country.country}
                        stroke={COUNTRY_COLORS[country.country] || '#6B7280'}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {chartData?.variable?.notes ? (
                <div className="mt-4 rounded-xl bg-earth-50 p-3 text-sm text-earth-600 dark:bg-dark-800/70 dark:text-dark-400">
                  {chartData.variable.notes}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No chart data available"
              description="This variable may not have data for the selected countries or waves."
            />
          )}

          {chartData?.lineData?.length ? (
            <div className="card p-5">
              <button
                type="button"
                onClick={() => setShowTable((previous) => !previous)}
                className="inline-flex items-center gap-2 rounded-lg border border-earth-200 px-3 py-2 text-sm text-earth-700 transition hover:bg-earth-50 dark:border-dark-700 dark:text-dark-300 dark:hover:bg-dark-800"
              >
                {showTable ? 'Hide data table' : 'Show data table'}
              </button>

              {showTable ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-earth-200 dark:border-dark-700">
                  <table className="min-w-full divide-y divide-earth-200 dark:divide-dark-700">
                    <thead className="bg-earth-50 dark:bg-dark-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
                          Country
                        </th>
                        {chartData.variable.waves.map((wave) => (
                          <th key={wave} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-earth-500 dark:text-dark-400">
                            <div>{wave}</div>
                            <div className="font-normal normal-case text-[11px]">{catalog.waveInfo?.[wave]?.years || ''}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-200 bg-white dark:divide-dark-700 dark:bg-dark-900">
                      {visibleCountries.map((row) => (
                        <tr key={row.countryCode} className="hover:bg-earth-50 dark:hover:bg-dark-800">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-earth-900 dark:text-dark-100">
                            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COUNTRY_COLORS[row.country] || '#6B7280' }} />
                            {row.country}
                          </td>
                          {chartData.variable.waves.map((wave) => (
                            <td key={wave} className="px-4 py-3 text-center text-sm text-earth-600 dark:text-dark-400">
                              {row[wave] != null ? (
                                <span className="font-mono">
                                  {Number(row[wave]).toFixed(2)}
                                  <span className="ml-1 text-xs text-earth-400 dark:text-dark-500">
                                    (n={row[`${wave}_n`] ?? '?'})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-earth-300 dark:text-dark-600">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
