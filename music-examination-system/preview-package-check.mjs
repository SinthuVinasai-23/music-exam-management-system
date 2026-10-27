import {createAuthServer} from './auth-server/server.mjs';
const {server}=await createAuthServer({config:{APP_URL:'http://127.0.0.1',PREVIEW_ADMIN_ACCESS:'true',AUTO_APPROVE_APPLICATIONS:'true'}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {const base='http://127.0.0.1:'+server.address().port;for(const path of ['/','/api/portal/session']) {const response=await fetch(base+path);if(!response.ok)throw new Error(path+' '+response.status);console.log('PASS extracted package '+path+' '+response.status)}}finally{await new Promise(resolve=>server.close(resolve))}
