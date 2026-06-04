/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg: '#fffbf5',
        ink: '#131212',
        primary: '#ff5a8d',
        yellow: '#ffe797',
        coral: '#FA6C78',
        surface: '#ffffff',
        border: '#f0ebe3',
        muted: '#9b8f85',
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
