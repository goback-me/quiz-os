/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1a1c1d',
      },
      borderRadius: {
        xl: '0.75rem',
      },
      fontFamily: {
        sans: ['General Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
