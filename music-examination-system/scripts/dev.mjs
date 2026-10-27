import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createAuthServer } from '../auth-server/server.mjs';
const port = Number(process.env.AUTH_PORT || 5001);
if (!process.env.APP_URL) process.env.APP_URL = 'http://127.0.0.1:' + (process.env.VITE_PORT || '5173');
const { server } = await createAuthServer();
server.on('error', error => { console.error(`Cannot start authentication server: ${error.code}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'runner', '--host', '127.0.0.1', '--port', process.env.VITE_PORT || '5173', '--strictPort'], { stdio: 'inherit', env: process.env });
  const stop = () => { vite.kill(); server.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  vite.on('exit', code => { server.close(); process.exitCode = code || 0; });
});
