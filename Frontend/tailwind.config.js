/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f766e',
          dark: '#0d5f59',
          light: '#5eead4',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0f766e',
          700: '#0d5f59',
          800: '#115e59',
          900: '#134e4a',
        },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        'risk-normal': '#22c55e',
        'risk-waspada': '#eab308',
        'risk-bahaya': '#ef4444',
        sidebar: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
          active: '#164e63',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
}