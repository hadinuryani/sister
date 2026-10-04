import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load .env from frontend/ and also root
  const envFrontend = loadEnv(mode, process.cwd(), '');
  const envRoot = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const env = { ...envRoot, ...envFrontend };

  const frontendPort = parseInt(env.FRONTEND_PORT || env.PORT || '5173', 10);
  const backendHost = env.BACKEND_HOST || 'localhost';
  const backendPort = env.BACKEND_PORT || env.PORT_BACKEND || '3000';

  // Dukung format URL langsung (ngrok HTTPS) maupun host:port biasa
  let targetUrl = `http://${backendHost}:${backendPort}`;
  const cleanHost = backendHost.replace(/\/+$/, '');
  if (cleanHost.startsWith('http://') || cleanHost.startsWith('https://')) {
    targetUrl = cleanHost;
  } else if (cleanHost.includes('ngrok')) {
    targetUrl = `https://${cleanHost}`;
  }

  return {
    plugins: [react()],
    server: {
      host: true, // Izinkan akses dari IP LAN
      port: frontendPort,
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
          secure: false,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        },
      },
    },
  };
});
