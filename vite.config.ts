import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path can be overridden for GitHub Pages deployments, e.g.
//   VITE_BASE=/Ear_and_Music_Training_App/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
