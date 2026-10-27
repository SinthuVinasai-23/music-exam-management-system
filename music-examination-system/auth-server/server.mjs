import { createPortal } from './portal.mjs';
import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmailSender } from './email.mjs';
const scrypt=promisify(crypto.scrypt);
const home=fileURLToPath(new URL('../',import.meta.url));
const token=()=>crypto.randomBytes(32).toString('hex');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const roles=['student','parent'];
class Failure extends Error { constructor(status,message,details={}) {super(message);this.status=status;this.details=details;} }
const fail=(status,message,details)=>{throw new Failure(status,message,details);};
export async function createAuthServer(options={}) {
  const config=options.config || process.env; const production=config.NODE_ENV==='production';
  const dataDir=options.dataDir || path.join(home,'auth-server','data'); mkdirSync(dataDir,{recursive:true});
  let secret=config.AUTH_SECRET;
  if (production && (!secret || secret.length<32 || !config.APP_URL?.startsWith('https://'))) throw new Error('Production requires AUTH_SECRET (32+ characters) and HTTPS APP_URL.');
  if (!secret) { const key=path.join(dataDir,'development.key');try {secret=readFileSync(key,'utf8');}catch{secret=token();writeFileSync(key,secret,{mode:0o600});} }
  const digest=(id,code)=>crypto.createHmac('sha256',secret).update(`${id}:${code}`).digest('hex');
  const db=new DatabaseSync(options.database || path.join(dataDir,'accounts.sqlite')); db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS auth_users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('student','parent')),verified INTEGER NOT NULL DEFAULT 0,student_id TEXT UNIQUE,created INTEGER NOT NULL);
  CREATE UNIQUE INDEX IF NOT EXISTS auth_email_lower ON auth_users(lower(email));
  CREATE TABLE IF NOT EXISTS auth_challenges(user_id TEXT PRIMARY KEY REFERENCES auth_users(id),code_hash TEXT NOT NULL,expires INTEGER NOT NULL,last_sent INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,delivery TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS auth_sessions(id_hash TEXT PRIMARY KEY,csrf TEXT NOT NULL,user_id TEXT REFERENCES auth_users(id),pending_id TEXT REFERENCES auth_users(id),expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,start INTEGER NOT NULL);`);
  const get=(q,...a)=>db.prepare(q).get(...a); const run=(q,...a)=>db.prepare(q).run(...a); const clock=options.clock || Date.now; const send=options.sendEmail || createEmailSender(config);
  const hashPassword=async password=>{const salt=token();const key=await scrypt(password,salt,64);return `${salt}:${key.toString('hex')}`;};
  const checkPassword=async(password,stored)=>{const [salt,key]=stored.split(':');const actual=await scrypt(password,salt,64);return crypto.timingSafeEqual(actual,Buffer.from(key,'hex'));};
  const dummyHash=await hashPassword(token());
  const cookie=(res,id)=>res.setHeader('Set-Cookie',`music_auth=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${production?'; Secure':''}`);
  function newSession(res,old,userId=null,pendingId=null) {
    if(old)run('DELETE FROM auth_sessions WHERE id_hash=?',old);
    const id=token(),csrf=token();run('INSERT INTO auth_sessions VALUES(?,?,?,?,?)',sha(id),csrf,userId,pendingId,clock()+8*3600000);cookie(res,id);return get('SELECT * FROM auth_sessions WHERE id_hash=?',sha(id));
  }
  function state(s) {
    const user=s.user_id?get('SELECT id,name,email,role,student_id FROM auth_users WHERE id=? AND verified=1',s.user_id):null;
    const pending=s.pending_id?get('SELECT u.email,u.role,c.expires,c.last_sent,c.delivery FROM auth_users u LEFT JOIN auth_challenges c ON c.user_id=u.id WHERE u.id=? AND u.verified=0',s.pending_id):null;
    return {csrf:s.csrf,user:user || null,pending:pending?{email:pending.email,role:pending.role,expiresAt:pending.expires,resendAt:pending.last_sent+60000,delivery:pending.delivery}:null};
  }
  function limit(key,max,windowMs) {
    const old=get('SELECT * FROM auth_limits WHERE key=?',key);
    if (!old || old.start+windowMs<=clock()) run('INSERT INTO auth_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,start=excluded.start',key,clock());
    else { if(old.count>=max)fail(429,'Too many attempts. Please try again later.');run('UPDATE auth_limits SET count=count+1 WHERE key=?',key); }
  }
  async function issue(user) {
    const old=get('SELECT * FROM auth_challenges WHERE user_id=?',user.id);
    if(old && old.last_sent+60000>clock())fail(429,'Please wait before requesting another code.',{resendAt:old.last_sent+60000});
    let code; do {code=String(crypto.randomInt(100000,1000000));}while(old?.code_hash===digest(user.id,code));
    run(`INSERT INTO auth_challenges VALUES(?,?,?,?,0,'sending') ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires=excluded.expires,last_sent=excluded.last_sent,attempts=0,delivery='sending'`,user.id,digest(user.id,code),clock()+900000,clock());
    try {await send({email:user.email,name:user.name,role:user.role,code});run("UPDATE auth_challenges SET delivery='sent' WHERE user_id=? AND code_hash=?",user.id,digest(user.id,code));}
    catch {run("UPDATE auth_challenges SET delivery='failed',code_hash='',expires=0 WHERE user_id=? AND code_hash=?",user.id,digest(user.id,code));fail(503,'We could not send your verification email. Your account is not activated. Please try Resend Code after the cooldown or contact support.',{pending:true});}
  }
  const portal=await createPortal(db,{clock,config});
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
    if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    const respond=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    try {
      if(await portal(req,res))return;
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(!pathname.startsWith('/api/auth/')) {
        if(!['GET','HEAD'].includes(req.method))fail(404,'Not found.');
        const root=path.join(home,'dist');let file=path.resolve(root,'.'+decodeURIComponent(pathname));const relative=path.relative(root,file);
        if(relative.startsWith('..')||path.isAbsolute(relative))fail(403,'Not found.');
        try {if(!(await stat(file)).isFile())file=path.join(root,'index.html');}catch {if(path.extname(pathname))fail(404,'Not found.');file=path.join(root,'index.html');}
        const body=await readFile(file);const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
        res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);return;
      }
      const raw=(req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('music_auth='))?.slice(11);
      let session=raw?get('SELECT * FROM auth_sessions WHERE id_hash=? AND expires>?',sha(raw),clock()):null;
      if(req.method==='GET' && pathname==='/api/auth/session') {if(!session)session=newSession(res);respond(200,state(session));return;}
      if(req.method!=='POST')fail(405,'Method not allowed.');
      if(!session || req.headers['x-csrf-token']!==session.csrf)fail(403,'Session expired. Refresh the page and try again.');
      if(req.headers.origin && req.headers.origin!==(config.APP_URL || 'http://127.0.0.1:5173'))fail(403,'Invalid request origin.');
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)fail(413,'Request too large.');}
      let d;try{d=JSON.parse(body || '{}');if(!d || typeof d!=='object' || Array.isArray(d))throw new Error();}catch{fail(400,'Invalid request.');}
      const ip=req.socket.remoteAddress || 'unknown';
      if(pathname==='/api/auth/register') {
        limit('register:'+ip,20,3600000);const name=String(d.name || '').trim(),email=String(d.email || '').trim(),password=d.password;
        if(!name || name.length>150)fail(400,'Name is required (maximum 150 characters).');
        if(email.length>254 || !/^[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(email))fail(400,'Enter a valid email address.');
        if(typeof password!=='string'||password.length<8||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))fail(400,'Use 8–128 characters with letters and numbers.');
        if(!roles.includes(d.role))fail(400,'Select Student or Parent.');
        if(get('SELECT 1 FROM auth_users WHERE lower(email)=lower(?)',email))fail(409,'This email is already registered. Log in to continue or resume verification.');
        const hashed=await hashPassword(password);const id=crypto.randomUUID();
        try{run('INSERT INTO auth_users VALUES(?,?,?,?,?,0,?,?)',id,name,email,hashed,d.role,d.role==='student'?`STU-${crypto.randomUUID()}`:null,clock());}catch(e){if(String(e.message).includes('UNIQUE'))fail(409,'This email is already registered.');throw e;}
        session=newSession(res,session.id_hash,null,id);await issue(get('SELECT * FROM auth_users WHERE id=?',id));respond(201,{...state(session),message:'Verification email sent.'});return;
      }
      if(pathname==='/api/auth/verify') {
        if(session.user_id)fail(409,'This account is already verified.');
        if(!session.pending_id)fail(401,'Register or log in to resume verification.');
        if(get('SELECT verified FROM auth_users WHERE id=?',session.pending_id)?.verified)fail(409,'This account is already verified. Please log in.');
        const challenge=get('SELECT * FROM auth_challenges WHERE user_id=?',session.pending_id);
        limit('verify:'+ip,50,900000);
        if(!challenge || challenge.delivery!=='sent')fail(400,'No verification email was sent. Please use Resend Code.');
        if(challenge.expires<=clock())fail(410,'Your verification code has expired. Please use Resend Code.');
        if(challenge.attempts>=5)fail(429,'Too many incorrect codes. Please use Resend Code after the cooldown.');
        run('UPDATE auth_challenges SET attempts=attempts+1 WHERE user_id=?',session.pending_id);
        if(typeof d.code!=='string'||!/^\d{6}$/.test(d.code)||!crypto.timingSafeEqual(Buffer.from(challenge.code_hash,'hex'),Buffer.from(digest(session.pending_id,d.code),'hex')))fail(400,'Invalid verification code');
        run('UPDATE auth_users SET verified=1 WHERE id=?',session.pending_id);run('DELETE FROM auth_challenges WHERE user_id=?',session.pending_id);
        session=newSession(res,session.id_hash,session.pending_id);respond(200,state(session));return;
      }
      if(pathname==='/api/auth/resend') {
        if(session.user_id)fail(409,'This account is already verified.');
        if(!session.pending_id)fail(401,'Register or log in to resume verification.');
        if(get('SELECT verified FROM auth_users WHERE id=?',session.pending_id)?.verified)fail(409,'This account is already verified. Please log in.');
        limit('resend:'+session.pending_id,10,3600000);await issue(get('SELECT * FROM auth_users WHERE id=?',session.pending_id));respond(200,{...state(session),message:'A new verification email has been sent.'});return;
      }
      if(pathname==='/api/auth/login') {
        const email=String(d.email||'').trim();if(!roles.includes(d.role))fail(400,'Select Student or Parent.');
        if(typeof d.password!=='string'||d.password.length>128)fail(400,'Enter your email and password.');
        limit('login:'+ip+':'+sha(email.toLowerCase()),10,900000);limit('login-ip:'+ip,100,900000);
        const user=get('SELECT * FROM auth_users WHERE lower(email)=lower(?)',email);const valid=await checkPassword(d.password,user?.password_hash||dummyHash);
        if(!user||!valid)fail(401,'Invalid email or password.');if(user.role!==d.role)fail(403,'Selected role does not match your account type.');
        session=newSession(res,session.id_hash,user.verified?user.id:null,user.verified?null:user.id);respond(200,state(session));return;
      }
      if(pathname==='/api/auth/logout'){session=newSession(res,session.id_hash);respond(200,state(session));return;}
      fail(404,'Not found.');
    }catch(error){respond(error.status || 500,{error:error.status?error.message:'Unable to complete the request. Please try again.',...(error.details || {})});}
  });
  server.on('close',()=>db.close());return {server,db};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {server}=await createAuthServer();const port=Number(process.env.AUTH_PORT||5001);
  server.listen(port,'127.0.0.1',()=>console.log(`Authentication server: http://127.0.0.1:${port}`));
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use.`:'Authentication server could not start.');process.exitCode=1;});
}
