import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { CATEGORIES, TIME_SERIES_VARIABLES, WAVE_INFO, MISSING_VALUES } from '../data/HARMONIZED_VARIABLES.js'

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

const dataCache = new Map()

function readCsvFromCandidates(relativePaths) {
  const candidates = relativePaths.flatMap((relativePath) => [
    path.join(__dirname, '..', relativePath),
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), '..', relativePath),
  ])

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue

    const raw = fs.readFileSync(candidate, 'utf-8')
    return parse(raw, {
      columns: true,
      skip_empty_lines: true,
      cast: (value) => {
        const trimmed = typeof value === 'string' ? value.trim() : value
        if (trimmed === '' || trimmed === 'NA' || trimmed === 'NaN') return null
        const num = Number(trimmed)
        return Number.isNaN(num) ? value : num
      },
    })
  }

  return null
}

function loadWaveData(wave) {
  if (dataCache.has(wave)) return dataCache.get(wave)

  const waveNum = String(wave).replace(/^W/i, '')
  const records = readCsvFromCandidates([
    path.join('data', `wave${waveNum}_data.csv`),
  ])

  if (!records) {
    return null
  }

  dataCache.set(wave, records)
  return records
}

function normalizeWaveKey(waveKey) {
  return String(waveKey || '').toUpperCase()
}

function reverseCode(value, scalePoints) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !scalePoints) return value
  return scalePoints + 1 - value
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
  return map[value] ?? value
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

  if (wave === 'W1' && value === 9) return 0
  return value
}

function applyRecode(value, recode, scalePoints, wave) {
  if (recode === 'reverse') return reverseCode(value, scalePoints)
  if (recode === 'remap') {
    if (scalePoints === 6 || scalePoints === '6') return remapTrust6to4(value)
    if (scalePoints === 3) return remapPolPart(value, wave)
  }
  return value
}

function isMissing(value, wave) {
  if (value == null || value === '' || Number.isNaN(value)) return true
  const missing = MISSING_VALUES[wave] || []
  return missing.includes(value)
}

function resolveColumnName(columns, target) {
  if (!target) return null
  if (columns.includes(target)) return target

  const lowerTarget = String(target).toLowerCase()
  const caseInsensitiveMatch = columns.find((column) => column.toLowerCase() === lowerTarget)
  if (caseInsensitiveMatch) return caseInsensitiveMatch

  const normalizedTarget = lowerTarget.replace(/[^a-z0-9]/g, '')
  return (
    columns.find((column) => column.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget) ||
    null
  )
}

function getCountryColumn(columns) {
  return (
    columns.find((column) => column.toLowerCase() === 'country_code') ||
    columns.find((column) => column.toLowerCase() === 'country') ||
    columns.find((column) => column.toLowerCase().includes('country')) ||
    null
  )
}

function buildCatalog() {
  return {
    categories: CATEGORIES,
    variables: TIME_SERIES_VARIABLES.map((variable) => ({
      id: variable.id,
      category: variable.category,
      subcategory: variable.subcategory,
      question: variable.question,
      label: variable.label || variable.question,
      scalePoints: variable.scalePoints,
      notes: variable.notes || null,
      waves: Object.keys(variable.waves || {}).map((wave) => normalizeWaveKey(wave)),
      includeTimeSeries: true,
    })),
    waveInfo: WAVE_INFO,
  }
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

    if (!variableId) {
      return res.status(200).json(buildCatalog())
    }

    const variable = TIME_SERIES_VARIABLES.find((entry) => entry.id === variableId)
    if (!variable) {
      return res.status(404).json({ error: `Variable '${variableId}' not found` })
    }

    const countryFilter = countries
      ? countries
          .split(',')
          .map((country) => Number(country))
          .filter((country) => Number.isFinite(country))
      : null

    const waveKeys = Object.keys(variable.waves || {})
      .map((wave) => normalizeWaveKey(wave))
      .sort()

    const resultsByWave = {}

    for (const wave of waveKeys) {
      const waveDef = variable.waves[wave]
      if (!waveDef) continue

      const data = loadWaveData(wave)
      if (!data || data.length === 0) continue

      const sampleRow = data[0]
      const columns = Object.keys(sampleRow)
      const valueColumn = resolveColumnName(columns, waveDef.var)
      const countryColumn = getCountryColumn(columns)

      if (!valueColumn || !countryColumn) continue

      const byCountry = {}

      for (const row of data) {
        const countryCode = Number(row[countryColumn])
        if (!COUNTRY_NAMES[countryCode]) continue
        if (countryFilter && !countryFilter.includes(countryCode)) continue

        let value = row[valueColumn]
        if (typeof value === 'string' && value !== '') {
          const parsed = Number(value)
          if (!Number.isNaN(parsed)) value = parsed
        }

        if (isMissing(value, wave)) continue

        value = applyRecode(value, waveDef.recode, variable.scalePoints, wave)
        if (value == null || Number.isNaN(value)) continue

        if (!byCountry[countryCode]) {
          byCountry[countryCode] = { sum: 0, count: 0, values: [] }
        }

        byCountry[countryCode].sum += value
        byCountry[countryCode].count += 1
        byCountry[countryCode].values.push(value)
      }

      const waveResults = {}
      for (const [countryCode, stats] of Object.entries(byCountry)) {
        const mean = stats.sum / stats.count
        const sortedValues = [...stats.values].sort((a, b) => a - b)
        const median = sortedValues[Math.floor(sortedValues.length / 2)]

        waveResults[countryCode] = {
          country: COUNTRY_NAMES[Number(countryCode)],
          countryCode: Number(countryCode),
          mean: Math.round(mean * 1000) / 1000,
          median,
          n: stats.count,
        }
      }

      resultsByWave[wave] = waveResults
    }

    const allCountryCodes = new Set()
    for (const wave of Object.keys(resultsByWave)) {
      for (const countryCode of Object.keys(resultsByWave[wave])) {
        allCountryCodes.add(Number(countryCode))
      }
    }

    const lineData = Array.from(allCountryCodes)
      .sort((a, b) => a - b)
      .map((countryCode) => {
        const row = {
          country: COUNTRY_NAMES[countryCode],
          countryCode,
        }

        for (const wave of waveKeys) {
          if (resultsByWave[wave]?.[countryCode]) {
            row[wave] = resultsByWave[wave][countryCode].mean
            row[`${wave}_n`] = resultsByWave[wave][countryCode].n
          }
        }

        return row
      })

    return res.status(200).json({
      variable: {
        id: variable.id,
        category: variable.category,
        subcategory: variable.subcategory,
        question: variable.question,
        label: variable.label || variable.question,
        scaleLabels: variable.scaleLabels || null,
        scalePoints: variable.scalePoints,
        notes: variable.notes || null,
        waves: waveKeys,
      },
      lineData,
      rawByWave: resultsByWave,
    })
  } catch (error) {
    console.error('Time series error:', error)
    return res.status(500).json({ error: error.message })
  }
}
