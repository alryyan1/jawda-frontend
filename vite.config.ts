import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { reactClickToComponent } from "vite-plugin-react-click-to-component";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5174,
    allowedHosts: ["server1", "localhost"],
  },
  plugins: [react(), tailwindcss(), reactClickToComponent()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-i18next": path.resolve(__dirname, "./src/lib/i18n-shim.ts"),
      i18next: path.resolve(__dirname, "./src/lib/i18n-shim.ts"),
      buffer: "buffer",
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  build: {
    // sourcemap: true,
    outDir: "c:/jawda-frontend/dist",
  },
  // Enable more detailed source maps in development
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
