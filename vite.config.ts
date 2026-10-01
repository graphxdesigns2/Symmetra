import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['mammoth'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Build and packaging output is never source: watching it wastes
        // watcher resources and, worse, the open directory handles block
        // electron-builder's staging rename on Windows (EPERM on
        // release\win-unpacked.tmp -> win-unpacked).
        ignored: ['**/release/**', '**/dist/**'],
      },
    },
  };
});