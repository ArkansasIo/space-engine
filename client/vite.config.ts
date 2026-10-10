import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          math: ['./src/lib/mathx.ts', './src/lib/calculus.ts', './src/lib/linalg.ts', './src/lib/rkmethods.ts'],
          sim: ['./src/sim/engine.ts', './src/sim/gravity.ts']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
      '@lib': resolve(here, 'src/lib'),
      '@sim': resolve(here, 'src/sim'),
      '@render': resolve(here, 'src/render'),
      '@ui': resolve(here, 'src/ui'),
      '@api': resolve(here, 'src/api')
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5173
  }
});
