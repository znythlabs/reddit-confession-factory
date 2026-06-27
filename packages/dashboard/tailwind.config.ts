import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1a18",
        parchment: "#f7f4ef",
        accent: "#b1351f",
      },
    },
  },
  plugins: [],
} satisfies Config;
