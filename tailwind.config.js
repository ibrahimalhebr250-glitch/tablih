/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#E8F4FD',
          100: '#D1E9FB',
          200: '#A3D3F7',
          300: '#75BDF3',
          400: '#47A7EF',
          500: '#2196F3',
          600: '#1A78C2',
          700: '#145A92',
          800: '#0D3C61',
          900: '#071E31',
        },
        secondary: {
          50: '#E8F8F0',
          100: '#D1F1E1',
          200: '#A3E3C3',
          300: '#75D5A5',
          400: '#47C787',
          500: '#27AE60',
          600: '#1F8B4D',
          700: '#17683A',
          800: '#0F4526',
          900: '#082313',
        },
      },
    },
  },
  plugins: [],
};
