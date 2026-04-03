import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// HuggingFace TTS backend has been removed.
// All TTS is now handled via the browser's Web Speech Synthesis API (free, no API key).

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  void env; // kept in case other env vars are needed
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path, // Keep the full path including /api
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
