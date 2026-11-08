import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/three/build/three.core.js')) return 'three-core';
          if (id.endsWith('/three/build/three.module.js')) return 'three-renderer';
        },
      },
    },
  },
});
