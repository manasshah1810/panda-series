import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Served under /vite on Vercel (see root vercel.json), so assets need that base.
export default defineConfig({
  base: '/vite/',
  plugins: [react()],
})
