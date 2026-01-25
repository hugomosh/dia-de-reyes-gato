import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // Base path for GitHub Pages - use './' for relative paths
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        state: resolve(__dirname, 'state.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          lenis: ['@studio-freight/lenis'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
