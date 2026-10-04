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

  return {
    plugins: [react()],
    server: {
      host: true, // Izinkan akses dari IP LAN
      port: frontendPort,
      proxy: {
        '/api': {
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
