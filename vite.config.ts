
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Logic: Check .env file, then System Env (Vercel), then fallback to hardcoded
  const apiKey = env.API_KEY || (process as any).env.API_KEY || 'AIzaSyDTNzmXXVEnblV5CCnq_UYcNMCWeZTLt14';
  const deepseekApiKey = env.DEEPSEEK_API_KEY || (process as any).env.DEEPSEEK_API_KEY || 'sk-dca3aa4912624de587520b32eb68f8a9';

  return {
    base: './', 
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
