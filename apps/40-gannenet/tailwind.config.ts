import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT:"#2b4a8b", dark:"#22386b", light:"#eef2fb" },
        teal:  { DEFAULT:"#2b8a80", light:"#e2f3f0" },
        gold:  { DEFAULT:"#c99a3b", light:"#f7efd8" },
        rose:  { DEFAULT:"#c1607e", light:"#f8e8ee" },
        ink:"#2a2c42", muted:"#6d6f88", paper:"#faf8f4", line:"#ebe7de"
      },
      fontFamily: { sans:["Heebo","Assistant","Rubik","system-ui","Arial","sans-serif"] },
      borderRadius: { xl:"1rem","2xl":"1.25rem" }
    }
  },
  plugins: []
};
export default config;
