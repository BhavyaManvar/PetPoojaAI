/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          bg: "#FAFAFA",
          card: "#FFFFFF",
          border: "#E8E8E8",
          dark: "#0A0A0A",
        },
        text: {
          primary: "#0A0A0A",
          secondary: "#525252",
          muted: "#A3A3A3",
          inverse: "#FAFAFA",
        },
        accent: {
          DEFAULT: "#171717",
          light: "#404040",
          dark: "#0A0A0A",
          muted: "rgba(23, 23, 23, 0.06)",
          warm: "#D97706",
        },
        btn: {
          DEFAULT: "#0A0A0A",
          hover: "#262626",
        },
        status: {
          star: "#D97706",
          plowhorse: "#2563EB",
          puzzle: "#7C3AED",
          dog: "#DC2626",
        },
        landing: {
          bg: "#000000",
          card: "#111111",
          border: "#222222",
          muted: "#888888",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
