import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import apiApp from './server/index.ts';

function recruitmentApiPlugin(): Plugin {
  return {
    name: 'nexus-recruitment-api',
    configureServer(server) {
      server.middlewares.use(apiApp);
    },
  };
}

export default defineConfig(() => {
  return {
    base: './', // Supports both GitHub Pages subpath and custom domain
    plugins: [react(), tailwindcss(), recruitmentApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

