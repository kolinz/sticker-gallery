import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const vitePort   = parseInt(env.VITE_PORT  ?? '5173', 10);
  const serverPort = parseInt(env.PORT       ?? '3000', 10);
  const serverHost = env.SERVER_HOST         ?? 'localhost';
  const apiTarget  = `http://${serverHost}:${serverPort}`;

  return {
    root: path.resolve(__dirname, 'client'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'client/dist'),
      emptyOutDir: true,
    },
    server: {
      host: 'localhost',
      port: vitePort,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
