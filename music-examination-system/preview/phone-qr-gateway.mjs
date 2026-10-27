import http from 'node:http';
const allowed = (path,method) => {
 const pathname=new URL(path,'http://localhost').pathname;
 if(method==='GET' && (['/examiner/admission','/ceremony/pass','/icfa-official-logo.png','/favicon.ico','/api/portal/session','/api/portal/ceremony/verify'].includes(pathname)||pathname.startsWith('/assets/')||/^\/api\/portal\/applications\/[^/]+\/marking-sheet$/.test(pathname)))return true;
 return false;
};
http.createServer((req,res)=>{
 if(!allowed(req.url,req.method)){res.writeHead(404,{'Content-Type':'text/plain'});res.end('This preview link is for student QR records only.');return;}
 const upstream=http.request({hostname:'127.0.0.1',port:5174,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:5174','x-qr-view-only':'1'}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)});
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end('QR preview temporarily unavailable.');});req.pipe(upstream);
}).listen(5176,'127.0.0.1',()=>console.log('Phone QR gateway ready on port 5176'));
