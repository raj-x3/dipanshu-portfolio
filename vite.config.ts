import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// three / R3F are large; keep them in their own chunks so the DOM site and the
// preloader can paint before the 3D bundle has finished parsing.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three') || id.includes('three-stdlib')) return 'r3f';
          if (id.includes('node_modules/gsap')) return 'gsap';
          if (id.includes('node_modules/framer-motion')) return 'motion';
        },
      },
    },
  },
});
