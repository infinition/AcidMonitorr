/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        acid: {
          green: '#ccff00',
          dark: '#0a0a0a',
          panel: '#111111',
          accent: '#00d2ff',
          danger: '#ff0055',
          plex: '#e5a00d',
          rd: '#b6e0ff'
        }
      }
    }
  },
  plugins: [],
}
