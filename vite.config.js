import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // En desarrollo, `npm run dev` (Vite) y `npm run server` (Node)
      // corren en puertos distintos. Este proxy hace que el navegador
      // siga hablando con rutas relativas ("/api/...") sin importar el
      // entorno — el mismo código de AppDataContext.jsx sirve para
      // desarrollo y para producción (donde server/index.js sirve todo
      // desde un solo puerto).
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
});
