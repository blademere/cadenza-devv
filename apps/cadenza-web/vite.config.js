import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');

  return {
    root: appRoot,
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(appRoot, 'src'),
      },
    },

    build: {
      outDir: path.resolve(appRoot, '../../dist/apps/cadenza-web'),
      emptyOutDir: true,
    },

    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
