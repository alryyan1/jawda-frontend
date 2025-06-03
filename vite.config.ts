import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, 
  },
  plugins: [
    react({
      // Enable React refresh
      refresh: true,
      // Enable development mode features
      development: process.env.NODE_ENV === 'development',
      // Enable source maps for development
      devTools: true,
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
  },
  // Enable more detailed source maps in development
  css: {
    devSourcemap: true,
  },
})
