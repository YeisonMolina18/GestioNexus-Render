/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#5D1227',
        'brand-green': '#16A34A',
        'brand-background': '#F3F4F6',
      }
    },
  },
  plugins: [],
}