import { defineConfig } from "vite"
import kiru from "vite-plugin-kiru"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [kiru({ devtools: true })],
})
