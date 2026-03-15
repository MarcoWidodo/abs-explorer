import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cache for data
let metadataCache = null
const dataCache = new Map()

function findDataPath(filename) {
  const possiblePaths = [
    path.join(__dirname, '..', 'data', filename),
    path.join(process.cwd(), 'data', filename),
  ]
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  throw new Error(`File not found: ${filename}. Tried: ${possiblePaths.join(', ')}`)
}

function getMetadata() {
  if (!metadataCache) {
    const dataPath = findDataPath('survey_metadata.json')
    metadataCache = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  }
  return metadataCache
}

function loadWaveData(waveNum) {
  const cacheKey = `wave${waveNum}`
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)
  }
  
  const filePath = findDataPath(`wave${waveNum}_data.csv`)
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    cast: (value) => {
      if (value === '' || value === 'NA' || value === 'NaN') return null
      const num = parseFloat(value)
      return isNaN(num) ? value : num
    }
  })
  
  dataCache.set(cacheKey, records)
  return records
}

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  
  try {
    const { wave, variable, countries } = req.query
    const metadata = getMetadata()
    
    const waveNum = parseInt((wave || 'wave5').replace('wave', ''))
    const data = loadWaveData(waveNum)
    const waveMeta = metadata[`wave${waveNum}`]
    
    if (!variable) {
      return res.status(400).json({ error: 'Variable parameter required' })
    }
    
    const varMeta = waveMeta?.variables[variable]
    if (!varMeta) {
      return res.status(404).json({ error: 'Variable not found' })
    }
    
    const valueLabels = varMeta.value_labels || {}
    
    const countryList = countries 
      ? countries.split(',').map(c => parseInt(c))
      : Object.keys(waveMeta.countries || {}).map(c => parseInt(c))
    
    const distribution = {}
    
    data.forEach(row => {
      const countryCode = parseInt(row.country_code)
      if (!countryList.includes(countryCode)) return
      
      const value = row[variable]
      if (value === null || value === undefined || value < 0) return
      
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
    
    const result = Object.values(distribution)
    
    const countryTotals = {}
    result.forEach(item => {
      if (!countryTotals[item.country_code]) countryTotals[item.country_code] = 0
      countryTotals[item.country_code] += item.weighted_count
    })
    
    result.forEach(item => {
      item.percent = (item.weighted_count / countryTotals[item.country_code]) * 100
    })
    
    result.sort((a, b) => a.response_value - b.response_value)
    
    res.status(200).json({
      variable,
      label: varMeta.label,
      data: result
    })
  } catch (err) {
    console.error('Distribution error:', err)
    res.status(500).json({ error: err.message })
  }
}
