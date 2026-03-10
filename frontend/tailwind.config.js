/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#305978',
          'primary-dark': '#244563',
          'primary-light': '#3d6d99',
          accent: '#EDAE49',
          'accent-dark': '#d49a3a',
          'accent-light': '#f5c978',
          dark: '#0b1d2e',
          'dark-lighter': '#112a3e',
          'dark-card': '#14304a',
          neutral: '#CFD0CF',
          light: '#E1F2FE',
          'light-dark': '#c5dff0',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
