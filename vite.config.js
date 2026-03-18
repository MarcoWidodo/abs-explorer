import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Increase chunk size warning limit slightly (default is 500kB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting for heavy dependencies
        manualChunks: {
          // React core - loaded on every page
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // Recharts - only needed on chart pages (SingleVariable, Correlations, TimeSeries)
          'vendor-recharts': [
            'recharts',
          ],
          // Mapping libraries - only needed on Map page and HomePage choropleth
          'vendor-maps': [
            'react-simple-maps',
            'topojson-client',
          ],
          // D3 utilities used across visualizations
          'vendor-d3': [
            'd3-scale',
            'd3-scale-chromatic',
          ],
          // Icons - relatively small but used everywhere
          'vendor-icons': [
            'lucide-react',
          ],
        },
      },
    },
  },
})
