import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React frontend for the Hospital Management System.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
