import {readFileSync} from 'node:fs';
import { createAuthServer } from './auth-server/server.mjs';
process.env.APP_URL ||= 'http://127.0.0.1:5174';
try{process.env.PUBLIC_APP_URL ||= JSON.parse(readFileSync(new URL('./.preview-tools/public-url.json',import.meta.url),'utf8')).url;}catch{}
process.env.AUTO_APPROVE_APPLICATIONS = 'true';
process.env.PREVIEW_ADMIN_ACCESS = 'true';
const {server}=await createAuthServer();
server.listen(5174,process.env.PREVIEW_HOST || '127.0.0.1',()=>console.log('ICFA preview: '+(process.env.PUBLIC_APP_URL || process.env.APP_URL)+'/register'));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'The preview is already using port 5174.':e.message);process.exitCode=1});
