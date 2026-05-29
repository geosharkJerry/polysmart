import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e2433",
        sky: "#1f6feb",
        mint: "#10b981",
        slateBlue: "#395886"
      },
      boxShadow: {
        float: "0 20px 40px -20px rgba(18, 52, 86, 0.4)"
      }
    }
  },
  plugins: []
};

export default config;
