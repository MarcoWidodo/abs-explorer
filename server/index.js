import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Data directory
const DATA_DIR = path.join(__dirname, '..', 'data')

// Load metadata
let metadata = null
try {
  metadata = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'survey_metadata.json'), 'utf-8'))
  console.log('✓ Metadata loaded')
} catch (err) {
  console.error('Failed to load metadata:', err)
}

// Cache for loaded CSV data
const dataCache = new Map()

// Load wave data
function loadWaveData(waveNum) {
  const cacheKey = `wave${waveNum}`
  
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)
  }
  
  const filePath = path.join(DATA_DIR, `wave${waveNum}_data.csv`)
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`)
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
      if (value === '' || value === 'NA' || value === 'NaN') return null
      const num = parseFloat(value)
      return isNaN(num) ? value : num
    }
  })
  
  dataCache.set(cacheKey, records)
  console.log(`✓ Loaded wave ${waveNum}: ${records.length} records`)
  
  return records
}

// Preload all waves
for (let i = 1; i <= 5; i++) {
  try {
    loadWaveData(i)
  } catch (err) {
    console.warn(`Could not preload wave ${i}:`, err.message)
  }
}

// API: Get metadata
app.get('/api/metadata', (req, res) => {
  res.json(metadata)
})

// API: Get distribution for a single variable
app.get('/api/distribution', (req, res) => {
  try {
    const { wave, variable, countries } = req.query
    
    if (!wave || !variable || !countries) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    
    const waveNum = parseInt(wave.replace('wave', ''))
    const countryList = countries.split(',').map(c => parseInt(c))
    
    const data = loadWaveData(waveNum)
    const waveMeta = metadata[`wave${waveNum}`]
    const varMeta = waveMeta?.variables[variable]
    
    if (!varMeta) {
      return res.status(404).json({ error: 'Variable not found' })
    }
    
    // Get value labels
    const valueLabels = varMeta.value_labels || {}
    
    // Calculate weighted distribution by country
    const distribution = {}
    
    data.forEach(row => {
      const countryCode = parseInt(row.country_code)
      if (!countryList.includes(countryCode)) return
      
      const value = row[variable]
      if (value === null || value === undefined || value < 0) return // Skip missing values
      
      const weight = row.w || 1
      const key = `${countryCode}-${value}`
      
      if (!distribution[key]) {
        distribution[key] = {
          country_code: countryCode,
          response_value: value,
          response_label: valueLabels[value] || value.toString(),
          weighted_count: 0,
          count: 0
        }
      }
      
      distribution[key].weighted_count += weight
      distribution[key].count += 1
    })
    
    // Convert to array and calculate percentages
    const result = Object.values(distribution)
    
    // Calculate totals by country for percentages
    const countryTotals = {}
    result.forEach(item => {
      if (!countryTotals[item.country_code]) {
        countryTotals[item.country_code] = 0
      }
      countryTotals[item.country_code] += item.weighted_count
    })
    
    // Add percentages
    result.forEach(item => {
      item.percent = (item.weighted_count / countryTotals[item.country_code]) * 100
    })
    
    // Sort by response value (numeric order)
    result.sort((a, b) => a.response_value - b.response_value)
    
    res.json({
      variable,
      label: varMeta.label,
      data: result
    })
  } catch (err) {
    console.error('Distribution error:', err)
    res.status(500).json({ error: err.message })
  }
})

// API: Get correlation data for scatter plot
app.get('/api/correlation', (req, res) => {
  try {
    const { wave, x, y, countries } = req.query
    
    if (!wave || !x || !y || !countries) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    
    const waveNum = parseInt(wave.replace('wave', ''))
    const countryList = countries.split(',').map(c => parseInt(c))
    
    const data = loadWaveData(waveNum)
    const waveMeta = metadata[`wave${waveNum}`]
    
    // Get value labels to identify non-responses
    const xLabels = waveMeta?.variables[x]?.value_labels || {}
    const yLabels = waveMeta?.variables[y]?.value_labels || {}
    
    // Non-response keywords
    const nonResponseKeywords = [
      'missing', "don't know", 'do not understand', "can't choose", 
      'decline to answer', 'not applicable', 'refused', 'no answer',
      'cannot choose', "can't determine"
    ]
    
    // Check if a value is a non-response
    const isNonResponse = (value, labels) => {
      if (value === null || value === undefined) return true
      if (value < 0) return true // Negative values are typically missing
      
      // Check common non-response codes
      if ([7, 8, 9, 97, 98, 99, 96, 95].includes(value)) {
        const label = labels[value]?.toLowerCase() || ''
        return nonResponseKeywords.some(kw => label.includes(kw))
      }
      
      // High values (90+) are often non-responses
      if (value >= 90) {
        const label = labels[value]?.toLowerCase() || ''
        return nonResponseKeywords.some(kw => label.includes(kw)) || label === ''
      }
      
      return false
    }
    
    // Aggregate data points (to avoid too many points)
    const aggregated = {}
    const rawByCountry = {}
    
    data.forEach(row => {
      const countryCode = parseInt(row.country_code)
      if (!countryList.includes(countryCode)) return
      
      const xVal = row[x]
      const yVal = row[y]
      
      // Skip non-response values
      if (isNonResponse(xVal, xLabels) || isNonResponse(yVal, yLabels)) return
      
      const weight = row.w || 1
      const key = `${countryCode}-${xVal}-${yVal}`
      
      if (!aggregated[key]) {
        aggregated[key] = {
          country_code: countryCode,
          x_value: xVal,
          y_value: yVal,
          count: 0,
          weight_sum: 0
        }
      }
      
      aggregated[key].count += 1
      aggregated[key].weight_sum += weight
      
      // Store raw data for statistics
      if (!rawByCountry[countryCode]) {
        rawByCountry[countryCode] = { x: [], y: [], w: [] }
      }
      rawByCountry[countryCode].x.push(xVal)
      rawByCountry[countryCode].y.push(yVal)
      rawByCountry[countryCode].w.push(weight)
    })
    
    // Calculate statistics for each country
    const statistics = {}
    
    Object.entries(rawByCountry).forEach(([countryCode, vals]) => {
      const n = vals.x.length
      if (n < 3) {
        statistics[countryCode] = { n, error: 'Insufficient data' }
        return
      }
      
      // Weighted means
      const totalWeight = vals.w.reduce((a, b) => a + b, 0)
      const meanX = vals.x.reduce((sum, x, i) => sum + x * vals.w[i], 0) / totalWeight
      const meanY = vals.y.reduce((sum, y, i) => sum + y * vals.w[i], 0) / totalWeight
      
      // Weighted covariance and variances
      let covXY = 0, varX = 0, varY = 0
      
      for (let i = 0; i < n; i++) {
        const w = vals.w[i]
        const dx = vals.x[i] - meanX
        const dy = vals.y[i] - meanY
        covXY += w * dx * dy
        varX += w * dx * dx
        varY += w * dy * dy
      }
      
      covXY /= totalWeight
      varX /= totalWeight
      varY /= totalWeight
      
      // Correlation
      const correlation = covXY / Math.sqrt(varX * varY)
      
      // Regression (y = slope * x + intercept)
      const slope = covXY / varX
      const intercept = meanY - slope * meanX
      
      // R-squared
      const rSquared = correlation * correlation
      
      // Approximate t-statistic and p-value
      const se = Math.sqrt((1 - rSquared) / (n - 2))
      const tStat = correlation * Math.sqrt(n - 2) / Math.sqrt(1 - rSquared)
      
      // Approximate p-value using normal distribution for large n
      const pValue = n > 30 
        ? 2 * (1 - normalCDF(Math.abs(tStat)))
        : estimatePValue(Math.abs(tStat), n - 2)
      
      statistics[countryCode] = {
        n,
        correlation: isNaN(correlation) ? null : correlation,
        r_squared: isNaN(rSquared) ? null : rSquared,
        slope: isNaN(slope) ? null : slope,
        intercept: isNaN(intercept) ? null : intercept,
        mean_x: meanX,
        mean_y: meanY,
        p_value: isNaN(pValue) ? null : pValue
      }
    })
    
    res.json({
      x_variable: x,
      y_variable: y,
      x_label: waveMeta?.variables[x]?.label,
      y_label: waveMeta?.variables[y]?.label,
      data: Object.values(aggregated),
      statistics
    })
  } catch (err) {
    console.error('Correlation error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Normal CDF approximation
function normalCDF(x) {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911
  
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  
  return 0.5 * (1.0 + sign * y)
}

// Simple p-value estimation for t-distribution
function estimatePValue(t, df) {
  // Approximation for small samples
  const x = df / (df + t * t)
  return betaIncomplete(df / 2, 0.5, x)
}

// Incomplete beta function approximation
function betaIncomplete(a, b, x) {
  if (x < 0 || x > 1) return 0
  if (x === 0) return 0
  if (x === 1) return 1
  
  // Simple approximation
  const bt = Math.exp(
    lgamma(a + b) - lgamma(a) - lgamma(b) + 
    a * Math.log(x) + b * Math.log(1 - x)
  )
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a
  } else {
    return 1 - bt * betaCF(b, a, 1 - x) / b
  }
}

// Beta continued fraction
function betaCF(a, b, x) {
  const maxIter = 100
  const eps = 3e-7
  
  let am = 1, bm = 1, az = 1
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let bz = 1 - qab * x / qap
  
  for (let m = 1; m <= maxIter; m++) {
    const em = m
    const tem = em + em
    let d = em * (b - m) * x / ((qam + tem) * (a + tem))
    const ap = az + d * am
    const bp = bz + d * bm
    d = -(a + em) * (qab + em) * x / ((a + tem) * (qap + tem))
    const app = ap + d * az
    const bpp = bp + d * bz
    const aold = az
    am = ap / bpp
    bm = bp / bpp
    az = app / bpp
    bz = 1
    if (Math.abs(az - aold) < eps * Math.abs(az)) return az
  }
  
  return az
}

// Log gamma function approximation
function lgamma(x) {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ]
  
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🌏 Asian Barometer Survey Explorer API`)
  console.log(`   Running at http://localhost:${PORT}`)
  console.log(`   ${Object.keys(metadata || {}).length} waves loaded\n`)
})
