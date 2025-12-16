import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // CRITICAL: Sets the base path to relative.
    // This allows the app to load assets correctly on GitHub Pages (https://user.github.io/repo/).
    base: './', 
    plugins: [react()],
    define: {
      // Replaces 'process.env' with a static object to prevent crashes.
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
        NODE_ENV: JSON.stringify(mode)
      }
    }
  };
});