import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const NASA_TAP_HOST = 'https://exoplanetarchive.ipac.caltech.edu';
const PROXY_CONFIG = {
  target: `${NASA_TAP_HOST}`,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/nasa\/exoplanets/, '/TAP/sync'),
  configure: (proxy: import('http-proxy').Server) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('Accept', 'application/json');
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nasa/exoplanets': PROXY_CONFIG,
    },
  },
  preview: {
    proxy: {
      '/api/nasa/exoplanets': PROXY_CONFIG,
    },
  },
});
