/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          bg: "#F4F4F4",
          card: "#FFFFFF",
          border: "#E5E5E5",
        },
        text: {
          primary: "#111111",
          secondary: "#4A4A4A",
          muted: "#8A8A8A",
        },
        accent: {
          DEFAULT: "#C47A2C",
          light: "#D4943F",
          dark: "#A86520",
          muted: "rgba(196, 122, 44, 0.08)",
        },
        btn: {
          DEFAULT: "#1F1F1F",
          hover: "#333333",
        },
        status: {
          star: "#C47A2C",
          plowhorse: "#3B82F6",
          puzzle: "#8B5CF6",
          dog: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
