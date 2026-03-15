import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    // Try multiple possible paths for Vercel compatibility
    const possiblePaths = [
      path.join(__dirname, '..', 'data', 'survey_metadata.json'),
      path.join(process.cwd(), 'data', 'survey_metadata.json'),
      path.join(process.cwd(), '..', 'data', 'survey_metadata.json'),
    ]
    
    let metadata = null
    let foundPath = null
    
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          metadata = JSON.parse(fs.readFileSync(p, 'utf-8'))
          foundPath = p
          break
        }
      } catch (e) {
        continue
      }
    }
    
    if (!metadata) {
      console.error('Could not find metadata at any path:', possiblePaths)
      return res.status(500).json({ 
        error: 'Metadata file not found',
        triedPaths: possiblePaths,
        cwd: process.cwd(),
        dirname: __dirname
      })
    }
    
    res.status(200).json(metadata)
  } catch (err) {
    console.error('Metadata error:', err)
    res.status(500).json({ error: err.message, stack: err.stack })
  }
}
