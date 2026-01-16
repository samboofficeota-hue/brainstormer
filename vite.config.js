import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env': {}
  },
  server: {
    port: 5173,
    strictPort: false, // ポートが使用中の場合は次の利用可能なポートを使用
  }
})
