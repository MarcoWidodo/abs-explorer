import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configPath = path.join(__dirname, 'harmonization_config.json')
const HARMONIZATION_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

export const HARMONIZATION_VERSION = HARMONIZATION_CONFIG.version
export const WAVE_INFO = HARMONIZATION_CONFIG.waveInfo || {}
export const MISSING_VALUES = HARMONIZATION_CONFIG.missingValues || {}
export const CATEGORIES = HARMONIZATION_CONFIG.categories || []
export const VARIABLES = HARMONIZATION_CONFIG.variables || []
export const TIME_SERIES_VARIABLES = VARIABLES.filter((variable) => variable.includeTimeSeries)

export function getVariablesByCategory(categoryName) {
  return TIME_SERIES_VARIABLES.filter((variable) => variable.category === categoryName)
}

export function getVariableById(variableId) {
  return TIME_SERIES_VARIABLES.find((variable) => variable.id === variableId) || null
}

export default HARMONIZATION_CONFIG
