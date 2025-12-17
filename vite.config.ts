import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || 'AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14';

  return {
    // CRITICAL: Sets the base path to the repository name for GitHub Pages.
    // If your repo name is different, change '/Textra.Ai/' to '/<repo-name>/'.
    base: '/Textra.Ai/', 
    plugins: [react()],
    define: {
      // Replaces process.env.API_KEY directly with the string value.
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Also define process.env.NODE_ENV just in case
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});