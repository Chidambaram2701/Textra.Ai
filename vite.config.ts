import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Prevents "ReferenceError: process is not defined"
      'process.env': {},
      // Safely exposes the API_KEY, defaulting to an empty string if missing to avoid crashes
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});