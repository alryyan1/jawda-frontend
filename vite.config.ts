import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, 
    port: 5174,
    allowedHosts: ['server1','localhost'],
  },
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-i18next': path.resolve(__dirname, './src/lib/i18n-shim.ts'),
      'i18next': path.resolve(__dirname, './src/lib/i18n-shim.ts'),
    },
  },
  build: {
    // sourcemap: true,
    outDir:'c:/jawda-frontend/dist'
  },
  // Enable more detailed source maps in development
  css: {
    devSourcemap: true,
  },
})
