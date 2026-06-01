import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    // Сервер запустится до конца сканирования зависимостей (избегаем «тихого» зависания)
    holdUntilCrawlEnd: false,
  },
  css: {
    preprocessorOptions: {
      scss: {
        charset: false
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    // Прогрев главной страницы — быстрее первый отклик в браузере
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/router/index.tsx', './src/pages/Home.tsx'],
    },
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
