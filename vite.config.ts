
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 確保靜態資源在 GitHub Pages 能正確載入
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
