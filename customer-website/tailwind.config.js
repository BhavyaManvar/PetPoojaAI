/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E23744',
          50: '#FEF2F2',
          100: '#FDE8E8',
          200: '#F9BFBF',
          300: '#F49696',
          400: '#EE5E66',
          500: '#E23744',
          600: '#CB2D39',
          700: '#A8232E',
          800: '#861B24',
          900: '#6D161E',
        },
        accent: '#FF7A59',
        bg: '#F4F4F5',
        card: '#FFFFFF',
        zomato: {
          red: '#E23744',
          dark: '#1C1C1C',
          gray: '#696969',
          light: '#F8F8F8',
          border: '#E8E8E8',
          green: '#3AB757',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.1)',
        drawer: '-4px 0 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
