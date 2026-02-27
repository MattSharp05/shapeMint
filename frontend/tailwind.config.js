/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#30597F',
          'primary-dark': '#244563',
          'primary-light': '#3d6d99',
          accent: '#EDAE49',
          'accent-dark': '#d49a3a',
          'accent-light': '#f5c978',
          neutral: '#CFD0CF',
          light: '#E1F2FE',
          'light-dark': '#c5dff0',
        },
      },
    },
  },
  plugins: [],
};
