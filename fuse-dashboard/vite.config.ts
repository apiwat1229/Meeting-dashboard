import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // Inline PostCSS config stops Vite from picking up ../postcss.config.mjs (Tailwind, used by the Next.js app).
  css: { postcss: { plugins: [] } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
