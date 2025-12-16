import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.API_KEY || 'AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14';

  return {
    // CRITICAL: Sets the base path to relative.
    // This allows the app to load assets correctly on GitHub Pages and Vercel.
    base: './', 
    plugins: [react()],
    define: {
      // Replaces process.env.API_KEY directly with the string value.
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Also define process.env.NODE_ENV just in case
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});