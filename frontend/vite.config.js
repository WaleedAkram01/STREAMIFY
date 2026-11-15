import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    // Backend CORS_ORIGIN mein yahi port allowed hai (http://localhost:5173)
    port: 5173,
    strictPort: true,
  }
})
