import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#12121a",
        "accent-blue": "#00d4ff",
        "accent-purple": "#b829dd",
        "accent-orange": "#ff6b2b",
        danger: "#ff0040",
        success: "#00ff88",
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        jetbrains: ["var(--font-jetbrains)", "monospace"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
