import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
 const env=loadEnv(mode,process.cwd(),'');
 const authServer=`http://127.0.0.1:${env.AUTH_PORT||process.env.AUTH_PORT||5001}`;
 return {cacheDir: '.vite-preview-cache',plugins:[react()],server:{host:'127.0.0.1',proxy:{'/api/auth':authServer,'/api/portal':authServer}}};
});
