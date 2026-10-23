import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      base: "#0F1535", deep: "#060B28", brand: "#0075FF", cyan: "#21D4FD",
      violet: "#4318FF", lilac: "#9F7AEA", ok: "#01B574", warn: "#FFB547",
      crit: "#E31A1A", muted: "#A0AEC0",
    },
    fontFamily: { sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"] },
    borderRadius: { card: "20px", field: "15px" },
    backgroundImage: {
      card: "linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)",
      alt: "linear-gradient(127.09deg, rgba(24,29,60,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)",
      info: "linear-gradient(90deg, #0075FF, #21D4FD)",
      menu: "linear-gradient(97.89deg, #05153F 28.26%, #072561 91.2%)",
    },
  } },
  plugins: [],
};
export default config;
