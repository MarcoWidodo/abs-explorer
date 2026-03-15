# Asian Barometer Survey Explorer v5

Interactive data visualization platform for exploring two decades of public opinion data across Asia-Pacific.

## Features

- **Single Variable Explorer**: Analyze response distributions across countries
- **Correlation Analysis**: Explore relationships between variables with scatter plots
- **Time Series**: Track changes in attitudes across survey waves (2001-2021)
- **Map Explorer**: Geographic choropleth visualization of survey responses
- **16 Countries**: Japan, South Korea, China, Taiwan, Hong Kong, Mongolia, Philippines, Thailand, Vietnam, Cambodia, Myanmar, Malaysia, Singapore, Indonesia, India, Australia
- **5 Survey Waves**: 2001-03, 2005-08, 2010-12, 2014-16, 2018-21

## Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Ensure data files are in place:**
   - `data/survey_metadata.json`
   - `data/wave1_data.csv` through `data/wave5_data.csv`

3. **Run development server:**
   ```bash
   npm run dev
   ```
   This starts both the API server (port 3001) and Vite dev server (port 5173).

4. **Or run separately:**
   ```bash
   # Terminal 1: API server
   npm run server
   
   # Terminal 2: Frontend
   npm run client
   ```

## Deployment to Vercel

This project is configured for easy deployment to Vercel's free tier.

### One-Click Deploy

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" and import your repository
4. Vercel will auto-detect Vite and configure the build
5. Click "Deploy"

### Manual Deploy via CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Important Notes for Vercel

- The `data/` folder with CSV files must be included in your repository
- API routes are in the `api/` folder as serverless functions
- The choropleth map uses bundled TopoJSON data (no external CDN required)
- Free tier includes 100GB bandwidth/month

## Project Structure

```
abs-explorer/
├── api/                    # Vercel serverless functions
│   ├── metadata.js         # GET /api/metadata
│   ├── distribution.js     # GET /api/distribution
│   └── correlation.js      # GET /api/correlation
├── data/                   # Survey data files
│   ├── survey_metadata.json
│   └── wave*_data.csv
├── public/                 # Static assets
├── server/                 # Local Express server (for dev)
├── src/
│   ├── components/         # React components
│   │   └── ChoroplethMap.jsx
│   ├── pages/              # Page components
│   ├── App.jsx             # Main app with routing
│   └── main.jsx            # Entry point
├── vercel.json             # Vercel configuration
└── package.json
```

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Charts**: Recharts, D3.js scales
- **Maps**: react-simple-maps with bundled world-atlas TopoJSON
- **Backend**: Express (local) / Vercel Serverless Functions (production)
- **Data**: CSV parsing with csv-parse

## Data Sources

Asian Barometer Survey data is publicly available from the [Asian Barometer](http://www.asianbarometer.org/) project.

## License

MIT License - See LICENSE file for details.
