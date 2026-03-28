import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const COUNTRY_NAMES = {
  1: 'Japan',
  2: 'Hong Kong',
  3: 'South Korea',
  4: 'China',
  5: 'Mongolia',
  6: 'Philippines',
  7: 'Taiwan',
  8: 'Thailand',
  9: 'Indonesia',
  10: 'Singapore',
  11: 'Vietnam',
  12: 'Cambodia',
  13: 'Malaysia',
  14: 'Myanmar',
  15: 'Australia',
  18: 'India',
}

let configCache = null
const dataCache = {}

function readJsonFromCandidates(relativePaths) {
  const candidates = relativePaths.flatMap((relativePath) => [
    path.join(__dirname, '..', relativePath),
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), '..', relativePath),
  ])

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf-8'))
      }
    } catch {
      continue
    }
  }

  return null
}

function loadConfig() {
  if (configCache) return configCache

  const config = readJsonFromCandidates([
    path.join('data', 'harmonization_config.json'),
    path.join('data', 'survey_metadata.json'),
  ])

  if (!config) {
    throw new Error('Could not load harmonization config')
  }

  configCache = config
  return configCache
}

function loadWaveData(wave) {
  if (dataCache[wave]) return dataCache[wave]

  const waveNum = wave.replace(/^W/i, '')
  const candidates = [
    path.join(__dirname, '..', 'data', `wave${waveNum}_data.csv`),
    path.join(process.cwd(), 'data', `wave${waveNum}_data.csv`),
    path.join(process.cwd(), '..', 'data', `wave${waveNum}_data.csv`),
  ]

  for (const csvPath of candidates) {
    try {
      if (!fs.existsSync(csvPath)) continue

      const raw = fs.readFileSync(csvPath, 'utf-8')
      const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        cast: (value) => {
          const trimmed = typeof value === 'string' ? value.trim() : value
          if (trimmed === '') return value
          const num = Number(trimmed)
          return Number.isNaN(num) ? value : num
        },
      })

      dataCache[wave] = records
      return records
    } catch {
      continue
    }
  }

  console.error(`Failed to load data for ${wave}`)
  return null
}

function reverseCode(value, scalePoints) {
  if (typeof value !== 'number' || scalePoints == null) return value
  return scalePoints + 1 - value
}

function isMissing(value, wave, config) {
  if (value == null || value === '' || value === undefined) return true
  const mvCodes = config.missingValues?.[wave] || []
  return mvCodes.includes(value)
}

function remapTrust6to4(value) {
  const map = {
    1: 4,
    2: 3.5,
    3: 3,
    4: 2,
    5: 1.5,
    6: 1,
  }
  return map[value] || value
}

function remapPolPart(value, wave) {
  if (wave === 'W4') {
    const map = { 1: 0, 2: 0, 3: 1, 4: 2 }
    return map[value] ?? value
  }

  if (wave === 'W5') {
    const map = { 1: 2, 2: 2, 3: 1, 4: 0, 5: 0 }
    return map[value] ?? value
  }

  if (wave === 'W1') {
    if (value === 9) return 0
    return value
  }

  return value
}

function applyRecode(value, recode, scalePoints, wave) {
  if (recode === 'reverse') {
    return reverseCode(value, scalePoints)
  }

  if (recode === 'remap') {
    if (scalePoints === 6 || scalePoints === '6') {
      return remapTrust6to4(value)
    }

    if (scalePoints === 3) {
      return remapPolPart(value, wave)
    }
  }

  return value
}

function resolveColumnName(columns, target) {
  if (!target) return null
  if (columns.includes(target)) return target

  const lowerTarget = String(target).toLowerCase()
  const caseInsensitiveMatch = columns.find((column) => column.toLowerCase() === lowerTarget)
  if (caseInsensitiveMatch) return caseInsensitiveMatch

  const normalizedTarget = lowerTarget.replace(/[^a-z0-9]/g, '')
  const normalizedMatch = columns.find(
    (column) => column.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget
  )
  return normalizedMatch || null
}

function getCountryColumn(columns) {
  return (
    columns.find((column) => column.toLowerCase() === 'country') ||
    columns.find((column) => column.toLowerCase().includes('country')) ||
    null
  )
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { variableId, countries } = req.query
    const config = loadConfig()

    if (!variableId) {
      const tsVars = (config.variables || [])
        .filter((variable) => variable.includeTimeSeries)
        .map((variable) => ({
          id: variable.id,
          category: variable.category,
          subcategory: variable.subcategory,
          question: variable.question,
          waves: Object.keys(variable.waves || {}),
          scalePoints: variable.scalePoints,
          notes: variable.notes || null,
        }))

      return res.status(200).json({
        categories: config.categories || [],
        variables: tsVars,
        waveInfo: config.waveInfo || {},
      })
    }

    const varDef = (config.variables || []).find((variable) => variable.id === variableId)
    if (!varDef) {
      return res.status(404).json({ error: `Variable '${variableId}' not found` })
    }

    const countryFilter = countries
      ? countries
          .split(',')
          .map((country) => Number(country))
          .filter((country) => Number.isFinite(country))
      : null

    const results = {}
    const waveKeys = Object.keys(varDef.waves || {}).sort()

    for (const wave of waveKeys) {
      const waveDef = varDef.waves[wave]
      const data = loadWaveData(wave)
      if (!data || data.length === 0) continue

      const sampleRow = data[0]
      const columns = Object.keys(sampleRow)
      const colName = resolveColumnName(columns, waveDef.var)
      if (!colName) {
        console.warn(`Column '${waveDef.var}' not found in ${wave}. Available: ${columns.slice(0, 10).join(', ')}...`)
        continue
      }

      const countryCol = getCountryColumn(columns)
      if (!countryCol) {
        console.warn(`Country column not found in ${wave}`)
        continue
      }

      const countryData = {}

      for (const row of data) {
        const countryCode = Number(row[countryCol])
        if (!COUNTRY_NAMES[countryCode]) continue
        if (countryFilter && !countryFilter.includes(countryCode)) continue

        let value = row[colName]
        if (typeof value === 'string' && value !== '') {
          const num = Number(value)
          if (!Number.isNaN(num)) value = num
        }

        if (isMissing(value, wave, config)) continue

        value = applyRecode(value, waveDef.recode, varDef.scalePoints, wave)
        if (value == null || Number.isNaN(value)) continue

        if (!countryData[countryCode]) {
          countryData[countryCode] = { sum: 0, count: 0, values: [] }
        }

        countryData[countryCode].sum += value
        countryData[countryCode].count += 1
        countryData[countryCode].values.push(value)
      }

      const waveResults = {}
      for (const [code, stats] of Object.entries(countryData)) {
        const mean = stats.sum / stats.count
        const sorted = [...stats.values].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]

        waveResults[code] = {
          country: COUNTRY_NAMES[Number(code)],
          countryCode: Number(code),
          mean: Math.round(mean * 1000) / 1000,
          median,
          n: stats.count,
        }
      }

      results[wave] = waveResults
    }

    const allCountryCodes = new Set()
    for (const wave of Object.keys(results)) {
      for (const code of Object.keys(results[wave])) {
        allCountryCodes.add(Number(code))
      }
    }

    const lineData = Array.from(allCountryCodes)
      .sort((a, b) => a - b)
      .map((code) => {
        const row = { country: COUNTRY_NAMES[code], countryCode: code }
        for (const wave of waveKeys) {
          if (results[wave] && results[wave][code]) {
            row[wave] = results[wave][code].mean
            row[`${wave}_n`] = results[wave][code].n
          }
        }
        return row
      })

    return res.status(200).json({
      variable: {
        id: varDef.id,
        category: varDef.category,
        subcategory: varDef.subcategory,
        question: varDef.question,
        scaleLabels: varDef.scaleLabels,
        scalePoints: varDef.scalePoints,
        notes: varDef.notes || null,
        waves: Object.keys(varDef.waves || {}),
      },
      lineData,
      rawByWave: results,
    })
  } catch (error) {
    console.error('Time series error:', error)
    return res.status(500).json({ error: error.message })
  }
}
