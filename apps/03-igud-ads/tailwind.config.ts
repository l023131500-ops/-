import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1A2E5A",
          gold: "#C9A84C",
          cream: "#F8F5EC",
          dark: "#0E1B36",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif Hebrew"', "serif"],
        sans: ['"Rubik"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
