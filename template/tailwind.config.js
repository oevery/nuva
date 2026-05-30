/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './server/**/*.{js,ts}',
    './node_modules/@oevery/nuva/app/**/*.{vue,js,ts}',
    './node_modules/@oevery/nuva/server/**/*.{js,ts}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
