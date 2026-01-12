
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Rely on environment variables provided by the deployment platform or local .env
  const apiKey = env.API_KEY || (process as any).env.API_KEY;
  const deepseekApiKey = env.DEEPSEEK_API_KEY || (process as any).env.DEEPSEEK_API_KEY;

  return {
    base: '/', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(deepseekApiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    }
  };
});
