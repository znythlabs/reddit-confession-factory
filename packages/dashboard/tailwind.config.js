module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App shell
        charcoal: "#0e0c0a",
        "charcoal-soft": "#171411",
        // Card surfaces
        panel: "#1c1815",
        "panel-soft": "#221d19",
        // Text
        parchment: "#e8dfd0",
        "parchment-muted": "#a89e8c",
        "ink-muted": "#6f665a",
        // Accent (deep red)
        accent: "#a8311c",
        "accent-soft": "#7a2316",
        "accent-fg": "#fbeae6",
        // Status
        success: "#5a8a4a",
        warning: "#b8884a",
        danger: "#a8311c",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 4px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
