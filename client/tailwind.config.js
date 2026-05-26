/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        cream: {
          50:  '#FDFCFA',
          100: '#F8F6F2',
          200: '#EDE9E2',
          300: '#DDD8CE',
        },
        gold: {
          400: '#D4A853',
          500: '#C49A3C',
          600: '#A8812C',
        },
      },
      letterSpacing: {
        editorial: '0.15em',
      },
    },
  },
  plugins: [],
};
