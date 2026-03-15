/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Earthy primary palette (light mode)
        earth: {
          50: '#faf8f5',
          100: '#f2ede5',
          200: '#e5dccb',
          300: '#d4c5a9',
          400: '#c2ab85',
          500: '#b4956b',
          600: '#a7835f',
          700: '#8b6b50',
          800: '#725845',
          900: '#5e493b',
          950: '#32261f',
        },
        // Dark mode palette (grey/black tones)
        dark: {
          50: '#f7f7f8',
          100: '#ececef',
          200: '#d5d6dc',
          300: '#b1b3be',
          400: '#878a9a',
          500: '#696c7d',
          600: '#545667',
          700: '#454655',
          800: '#3b3c48',
          900: '#27272f',
          925: '#1e1e24',
          950: '#131316',
          975: '#0a0a0c',
        },
        // Forest green accent
        forest: {
          50: '#f3f6f4',
          100: '#e2ebe5',
          200: '#c6d7cd',
          300: '#9fb9a9',
          400: '#739681',
          500: '#537963',
          600: '#40604e',
          700: '#354d40',
          800: '#2c3f35',
          900: '#26352d',
          950: '#131d19',
        },
        // Terracotta warm accent
        terra: {
          50: '#fdf6f3',
          100: '#fceae3',
          200: '#fad6ca',
          300: '#f5b8a3',
          400: '#ed8e6f',
          500: '#e26d47',
          600: '#cf5431',
          700: '#ad4327',
          800: '#8f3924',
          900: '#763323',
          950: '#40170e',
        },
        // Slate blue for data viz
        slate: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b1bac9',
          400: '#8795ab',
          500: '#687891',
          600: '#536177',
          700: '#444f61',
          800: '#3b4452',
          900: '#353b46',
          950: '#23272e',
        },
        // Chart colors for countries (light mode)
        chart: {
          1: '#537963',  // forest green
          2: '#8b6b50',  // earth brown
          3: '#e26d47',  // terracotta
          4: '#687891',  // slate blue
          5: '#9fb9a9',  // sage
          6: '#c2ab85',  // sand
          7: '#cf5431',  // rust
          8: '#354d40',  // dark forest
          9: '#b4956b',  // camel
          10: '#40604e', // hunter green
          11: '#ed8e6f', // coral
          12: '#725845', // cocoa
          13: '#8795ab', // steel blue
          14: '#5e493b', // espresso
          15: '#a7835f', // bronze
          16: '#2c3f35', // evergreen
        },
        // Chart colors for countries (dark mode - brighter/more saturated)
        chartDark: {
          1: '#6fcf97',  // bright green
          2: '#f2c94c',  // golden yellow
          3: '#f2994a',  // bright orange
          4: '#56ccf2',  // sky blue
          5: '#bb6bd9',  // purple
          6: '#eb5757',  // coral red
          7: '#27ae60',  // emerald
          8: '#9b51e0',  // violet
          9: '#2d9cdb',  // blue
          10: '#f2c94c', // yellow
          11: '#ff8a80', // salmon
          12: '#80cbc4', // teal
          13: '#b39ddb', // lavender
          14: '#ffab91', // peach
          15: '#a5d6a7', // light green
          16: '#90caf9', // light blue
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
