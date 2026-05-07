/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        paper: "#0a0a0a",
        "paper-light": "#141414",
        line: "#2a2a2a",
        accent: "#ffffff",
        signal: "#ff006e",
        success: "#00ff88",
        text: "#e8e8e8",
        "text-dim": "#888888"
      },
      boxShadow: {
        "panel": "0 4px 24px rgba(0, 0, 0, 0.6)",
        "panel-lg": "0 8px 40px rgba(0, 0, 0, 0.7)"
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.25s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideIn: {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      },
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem"
      }
    }
  },
  plugins: []
}
