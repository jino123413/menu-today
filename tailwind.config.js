/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2BB673',
        },
      },
      fontFamily: {
        gmarket: ['GmarketSans', 'Pretendard Variable', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
