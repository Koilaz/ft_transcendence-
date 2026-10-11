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
    'font-bla-bla',
    // Ajoute ici les autres classes de polices quand tu les crées
    // 'font-ninja',
    // 'font-robot',
  ],
  plugins: [],
}