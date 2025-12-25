/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['TASA Explorer', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        accent: {
          50: '#f5f3f0',
          100: '#e8e2d9',
          200: '#d4c8b8',
          300: '#b8a892',
          400: '#9d8b73',
          500: '#8b7355', // Pantone Mocha Mouse
          600: '#6d5a44',
          700: '#574838',
          800: '#463a2e',
          900: '#3a3026',
        },
        ink: '#0a0a0a',
        surface: '#fafafa',
      },
    },
  },
  plugins: [],
};

