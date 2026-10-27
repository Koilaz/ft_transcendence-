/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        wasabi: ['"Mochiy Pop P One"', 'cursive'],
        ketchup: ['"Black Ops One"', 'cursive'],
        moutarde: ['"Cinzel"', 'serif'],
        cocktail: ['"Orbitron"', 'sans-serif'],
        mayo: ['"Parisienne"', 'cursive'],
        poivre: ['"MedievalSharp"', 'cursive'],
        bangers: ['"Bangers"', 'cursive'],
      },
    },
  },
  safelist: [
    'font-wasabi',
    'font-ketchup',
    'font-moutarde',
    'font-cocktail',
    'font-mayo',
    'font-poivre',
    'font-bangers',
  ],
  plugins: [],
}
