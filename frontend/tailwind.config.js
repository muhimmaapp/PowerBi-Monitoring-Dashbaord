/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          bg: "#060a14",
          panel: "#0c1222",
          card: "#111a2e",
          hover: "#162038",
          input: "#1a2340",
        },
        tx: {
          1: "#e2e8f0",
          2: "#94a3b8",
          3: "#64748b",
          4: "#475569",
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'Cascadia Code'", "'Fira Code'", "monospace"],
      },
    },
  },
  plugins: [],
};
