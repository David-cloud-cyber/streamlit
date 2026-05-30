import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        line: "#d8dee9",
        panel: "#ffffff",
        canvas: "#f5f7fb",
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#1f7aec",
          600: "#175fd0",
          700: "#164ba5"
        },
        mint: {
          100: "#dff8ed",
          600: "#16855c"
        },
        amber: {
          100: "#fff0ca",
          700: "#a96500"
        }
      },
      boxShadow: {
        panel: "0 10px 30px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
