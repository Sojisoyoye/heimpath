import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // Disable Vite's inline modulepreload polyfill so it doesn't violate
    // the `script-src 'self'` CSP directive (the polyfill is only needed
    // for browsers that are >3 years old and no longer in our support matrix).
    modulePreload: { polyfill: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    // Proxy /api/... to the backend so cookies are set on the same origin
    // (localhost) in both local dev and playwright CI.  Without this, the
    // backend at a different hostname (e.g. backend:8000) would set cookies
    // on its own domain, making them invisible to document.cookie at
    // localhost:5173 and breaking isLoggedIn() checks.
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
})
