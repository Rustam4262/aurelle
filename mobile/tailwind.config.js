/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C81D60",
          50: "#fdf2f8",
          100: "#fce7f3",
          500: "#C81D60",
          600: "#a8174f",
          700: "#881240",
        },
        brand: "#C81D60",
      },
    },
  },
  plugins: [],
};
