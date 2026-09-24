import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the Express backend without stripping the prefix.
      // The backend mounts all routes under /api (e.g. /api/auth/login),
      // so the path must be forwarded as-is.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Split large third-party libraries into separate cached chunks.
        // Each key becomes a chunk filename; its modules are bundled together.
        manualChunks: {
          // Recharts + its d3 deps (~430 kB) — rarely changes, good cache target
          'vendor-recharts': ['recharts'],
          // React core — also very stable
          'vendor-react': ['react', 'react-dom'],
          // Router
          'vendor-router': ['react-router-dom'],
        },
      },
    },
  },
});
