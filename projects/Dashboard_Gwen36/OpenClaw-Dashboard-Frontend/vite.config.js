import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Настройка proxy для пересылки запросов к Backend
  server: {
    proxy: {
      // Все запросы к /api пересылаются на Backend
      '/api': 'http://localhost:3000',
      // Health check тоже пересылаем
      '/health': 'http://localhost:3000',
      // WebSocket подключение к Socket.IO
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  
  // Отключаем CSP для разработки
  build: {
    target: 'esnext',
  },
});
