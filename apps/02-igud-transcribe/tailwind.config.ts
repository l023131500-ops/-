import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // איגוד השיעורים — כחול ראשי / זהב
        brand: {
          DEFAULT: "#1A2E5A",
          dark: "#0F1D3D",
          light: "#2E4581"
        },
        accent: {
          DEFAULT: "#C9A84C",
          light: "#F2D678",
          dark: "#A88937"
        },
        ink: {
          DEFAULT: "#1A1A1A",
          muted: "#666"
        },
        paper: "#FBFAF6",
        sand: "#F4EFE2"
      },
      fontFamily: {
        serif: ['"Noto Serif Hebrew"', "Frank Ruhl Libre", "serif"],
        sans: ["Rubik", "Heebo", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,30,60,0.04), 0 4px 16px rgba(20,30,60,0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
