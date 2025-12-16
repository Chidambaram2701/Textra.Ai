import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Replaces 'process.env' with a static object. 
      // This prevents "ReferenceError: process is not defined" and safely injects the key.
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
        NODE_ENV: JSON.stringify(mode)
      }
    }
  };
});