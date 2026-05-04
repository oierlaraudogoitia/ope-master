/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  safelist: [
    // Block colors (so dynamic classes survive purge)
    { pattern: /(bg|text|border|ring)-(amber|rose|emerald|sky|violet|teal|indigo|stone)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  plugins: [],
};
