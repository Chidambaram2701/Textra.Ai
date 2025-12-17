import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || 'AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14';

  return {
    // Using relative base path allows the app to be deployed anywhere (Vercel or GitHub Pages)
    base: './', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});