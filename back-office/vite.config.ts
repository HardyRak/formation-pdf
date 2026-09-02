import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config du back-office.
 *
 * `server.proxy` redirige `/v1` vers le backend NestJS pendant le dev :
 * le back-office appelle toujours des URL relatives (`/v1/...`), ce qui
 * évite tout souci CORS et rend le code portable en production.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Accepte tous les hosts de prévisualisation (ex. *.e2b.app) et le localhost.
    allowedHosts: true,
    proxy: {
      '/v1': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
