import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

// Country colors (consistent palette)
const COUNTRY_COLORS = {
  Japan: '#E63946', 'Hong Kong': '#457B9D', 'South Korea': '#1D3557',
  China: '#E9C46A', Mongolia: '#2A9D8F', Philippines: '#264653',
  Taiwan: '#F4A261', Thailand: '#6A0572', Indonesia: '#118AB2',
  Singapore: '#06D6A0', Vietnam: '#EF476F', Cambodia: '#FFD166',
  Malaysia: '#073B4C', Myanmar: '#8338EC', Australia: '#3A86A7',
  India: '#FB5607'
};

const WAVE_LABELS = {
  W1: '2001–03', W2: '2005–08', W3: '2010–12', W4: '2014–16', W5: '2018–20'
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-semibold text-sm mb-1 text-gray-800 dark:text-gray-200">
        {label} ({WAVE_LABELS[label] || label})
      </p>
      {payload
        .filter(p => p.value != null)
        .sort((a, b) => b.value - a.value)
        .map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate">{p.name}</span>
            <span className="ml-auto font-mono font-semibold text-gray-800 dark:text-gray-200">
              {p.value.toFixed(2)}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function TimeSeriesExplorer() {
  const [metadata, setMetadata] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedVariable, setSelectedVariable] = useState('');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Load metadata (variable list)
  useEffect(() => {
    fetch(`${API_BASE}/api/timeseries`)
      .then(r => r.json())
      .then(data => {
        setMetadata(data);
        setLoading(false);
        // Default: select first category
        if (data.categories?.length > 0) {
          setSelectedCategory(data.categories[0].name);
        }
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Derived: categories
  const categories = useMemo(() => {
    if (!metadata) return [];
    return metadata.categories || [];
  }, [metadata]);

  // Derived: subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory || !metadata) return [];
    const cat = categories.find(c => c.name === selectedCategory);
    return cat?.subcategories || [];
  }, [selectedCategory, categories, metadata]);

  // Derived: filtered variables
  const filteredVariables = useMemo(() => {
    if (!metadata) return [];
    return metadata.variables.filter(v => {
      if (selectedCategory && v.category !== selectedCategory) return false;
      if (selectedSubcategory && v.subcategory !== selectedSubcategory) return false;
      return true;
    });
  }, [metadata, selectedCategory, selectedSubcategory]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory('');
    setSelectedVariable('');
    setChartData(null);
  }, [selectedCategory]);

  // Reset variable when subcategory changes
  useEffect(() => {
    setSelectedVariable('');
    setChartData(null);
  }, [selectedSubcategory]);

  // Auto-select first variable when filter changes
  useEffect(() => {
    if (filteredVariables.length > 0 && !selectedVariable) {
      setSelectedVariable(filteredVariables[0].id);
    }
  }, [filteredVariables]);

  // Fetch data when variable changes
  useEffect(() => {
    if (!selectedVariable) return;
    setDataLoading(true);
    const params = new URLSearchParams({ variableId: selectedVariable });
    if (selectedCountries.length > 0) {
      params.set('countries', selectedCountries.join(','));
    }
    fetch(`${API_BASE}/api/timeseries?${params}`)
      .then(r => r.json())
      .then(data => {
        setChartData(data);
        setDataLoading(false);
        // Default: select all countries if none selected
        if (selectedCountries.length === 0 && data.lineData) {
          setSelectedCountries(data.lineData.map(d => d.countryCode));
        }
      })
      .catch(e => { setError(e.message); setDataLoading(false); });
  }, [selectedVariable]);

  // Refetch when country selection changes (but only if we have data)
  const refetchWithCountries = useCallback((countries) => {
    if (!selectedVariable) return;
    setDataLoading(true);
    const params = new URLSearchParams({ variableId: selectedVariable });
    if (countries.length > 0) {
      params.set('countries', countries.join(','));
    }
    fetch(`${API_BASE}/api/timeseries?${params}`)
      .then(r => r.json())
      .then(data => { setChartData(data); setDataLoading(false); })
      .catch(e => { setError(e.message); setDataLoading(false); });
  }, [selectedVariable]);

  const toggleCountry = (code) => {
    setSelectedCountries(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      refetchWithCountries(next);
      return next;
    });
  };

  const selectAllCountries = () => {
    if (!chartData) return;
    const all = chartData.lineData.map(d => d.countryCode);
    setSelectedCountries(all);
    refetchWithCountries(all);
  };

  const clearCountries = () => {
    setSelectedCountries([]);
  };

  // Current variable info
  const currentVar = useMemo(() => {
    if (!metadata || !selectedVariable) return null;
    return metadata.variables.find(v => v.id === selectedVariable);
  }, [metadata, selectedVariable]);

  // Chart data formatted for Recharts
  const rechartsData = useMemo(() => {
    if (!chartData?.lineData) return [];
    const waves = chartData.variable.waves;
    return waves.map(wave => {
      const point = { wave, label: WAVE_LABELS[wave] || wave };
      for (const row of chartData.lineData) {
        if (selectedCountries.includes(row.countryCode) && row[wave] != null) {
          point[row.country] = row[wave];
        }
      }
      return point;
    });
  }, [chartData, selectedCountries]);

  // Countries in current data
  const availableCountries = useMemo(() => {
    if (!chartData?.lineData) return [];
    return chartData.lineData.map(d => ({
      code: d.countryCode,
      name: d.country,
      selected: selectedCountries.includes(d.countryCode)
    }));
  }, [chartData, selectedCountries]);

  // Export CSV
  const exportCSV = () => {
    if (!chartData?.lineData || !chartData?.variable) return;
    const waves = chartData.variable.waves;
    const headers = ['Country', 'Country Code', ...waves.map(w => `${w} Mean`), ...waves.map(w => `${w} N`)];
    const rows = chartData.lineData
      .filter(d => selectedCountries.includes(d.countryCode))
      .map(d => [
        d.country, d.countryCode,
        ...waves.map(w => d[w] ?? ''),
        ...waves.map(w => d[`${w}_n`] ?? '')
      ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abs_timeseries_${selectedVariable}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Time-Series Explorer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track how public opinion has evolved across {metadata?.waveInfo ? Object.keys(metadata.waveInfo).length : 5} waves
          of the Asian Barometer Survey (2001–2020).
          {currentVar && (
            <span className="ml-1">
              Showing <strong>{filteredVariables.length}</strong> variables
              in <em>{selectedCategory}</em>.
            </span>
          )}
        </p>
      </div>

      {/* Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Subcategory */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Sub-Category
          </label>
          <select
            value={selectedSubcategory}
            onChange={e => setSelectedSubcategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All sub-categories</option>
            {subcategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Variable */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Variable ({filteredVariables.length})
          </label>
          <select
            value={selectedVariable}
            onChange={e => { setSelectedVariable(e.target.value); setSelectedCountries([]); }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {filteredVariables.map(v => (
              <option key={v.id} value={v.id}>
                {v.question.length > 80 ? v.question.slice(0, 77) + '...' : v.question}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question display */}
      {currentVar && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
            {currentVar.question}
          </p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-blue-700 dark:text-blue-300">
            <span>Waves: {currentVar.waves.join(', ')}</span>
            <span>•</span>
            <span>Scale: {currentVar.scalePoints}-point</span>
            {currentVar.notes && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400">⚠ {currentVar.notes}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Country Pills */}
      {availableCountries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Countries</span>
            <button onClick={selectAllCountries} className="text-xs text-blue-500 hover:text-blue-700">Select All</button>
            <button onClick={clearCountries} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableCountries.map(c => (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  c.selected
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={c.selected ? { backgroundColor: COUNTRY_COLORS[c.name] || '#6B7280' } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {dataLoading ? (
        <div className="flex items-center justify-center h-80 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : rechartsData.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={rechartsData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="wave"
                tick={{ fontSize: 12 }}
                tickFormatter={w => WAVE_LABELS[w] || w}
              />
              <YAxis
                domain={chartData?.variable?.scalePoints ? [1, chartData.variable.scalePoints] : ['auto', 'auto']}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'Mean',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6B7280' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {chartData?.lineData
                .filter(d => selectedCountries.includes(d.countryCode))
                .map(d => (
                  <Line
                    key={d.country}
                    type="monotone"
                    dataKey={d.country}
                    stroke={COUNTRY_COLORS[d.country] || '#6B7280'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Scale reference */}
          {chartData?.variable?.scaleLabels && Object.keys(chartData.variable.scaleLabels).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Scale: {Object.entries(chartData.variable.scaleLabels).map(([k, v]) => `${k}=${v}`).join(', ')}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Action buttons */}
      {chartData && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {showTable ? 'Hide' : 'Show'} Data Table
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            Export CSV
          </button>
        </div>
      )}

      {/* Data Table */}
      {showTable && chartData?.lineData && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Country
                </th>
                {chartData.variable.waves.map(w => (
                  <th key={w} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {w}<br /><span className="font-normal normal-case">{WAVE_LABELS[w]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {chartData.lineData
                .filter(d => selectedCountries.includes(d.countryCode))
                .map(d => (
                  <tr key={d.countryCode} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COUNTRY_COLORS[d.country] }} />
                      {d.country}
                    </td>
                    {chartData.variable.waves.map(w => (
                      <td key={w} className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        {d[w] != null ? (
                          <span>
                            <span className="font-mono">{d[w].toFixed(2)}</span>
                            <span className="text-xs text-gray-400 ml-1">(n={d[`${w}_n`] || '?'})</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
