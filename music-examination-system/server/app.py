import base64
import hashlib
import io
import json
import os
import importlib
import re
import secrets
import sqlite3
import time
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from flask import Flask, abort, g, jsonify, request, send_file, session
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image, UnidentifiedImageError
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from payments import PaymentService, PaymentUnavailable

ROOT = Path(__file__).resolve().parent
def uid(prefix=''): return prefix + secrets.token_hex(16)
def now(): return datetime.now(timezone.utc).isoformat()
def fail(message, status=400): abort(status, description=message)
def dob_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{2}/\d{2}/\d{4}', value): fail('Date of Birth must use (dd/mm/yyyy).')
    try: d = datetime.strptime(value, '%d/%m/%Y').date()
    except ValueError: fail('Date of Birth must be a valid calendar date.')
    if d > date.today(): fail('Date of Birth cannot be in the future.')
    return d
def age(value):
    d = dob_date(value); t = date.today()
    return t.year-d.year-((t.month,t.day)<(d.month,d.day))

def create_app(config=None):
    app = Flask(__name__, static_folder='../dist', static_url_path='/assets-build')
    production = os.getenv('PORTAL_ENV') == 'production'
    app.config.update(DATABASE=str(ROOT/'data'/'portal.sqlite3'), UPLOAD_FOLDER=str(ROOT/'data'/'media'), SECRET_KEY=os.getenv('SECRET_KEY'), MEDIA_KEY=os.getenv('MEDIA_KEY'), MAX_CONTENT_LENGTH=6*1024*1024, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', SESSION_COOKIE_SECURE=production, PERMANENT_SESSION_LIFETIME=timedelta(hours=8), BASE_URL=os.getenv('BASE_URL','http://localhost:5173'), PAYMENT_SERVICE=PaymentService(), PRODUCTION=production)
    if config: app.config.update(config)
    if os.getenv('PAYMENT_FACTORY'):
        module, factory=os.environ['PAYMENT_FACTORY'].split(':',1)
        app.config['PAYMENT_SERVICE']=getattr(importlib.import_module(module),factory)()
    if app.config['PRODUCTION'] and (not app.config['SECRET_KEY'] or not app.config['MEDIA_KEY'] or not app.config['BASE_URL'].startswith('https://')):
        raise RuntimeError('Production requires SECRET_KEY, MEDIA_KEY and HTTPS BASE_URL.')
    data = Path(app.config['DATABASE']).parent; data.mkdir(parents=True,exist_ok=True)
    # Persist generated development keys so restarts do not destroy encrypted media.
    keyfile = data/'development-keys.json'
    if not app.config['SECRET_KEY'] or not app.config['MEDIA_KEY']:
        if not keyfile.exists(): keyfile.write_text(json.dumps({'session':secrets.token_hex(32),'media':base64.b64encode(AESGCM.generate_key(bit_length=256)).decode()}))
        keys=json.loads(keyfile.read_text()); app.config['SECRET_KEY']=app.config['SECRET_KEY'] or keys['session']; app.config['MEDIA_KEY']=app.config['MEDIA_KEY'] or keys['media']
    cipher=AESGCM(base64.b64decode(app.config['MEDIA_KEY']))
    Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True,exist_ok=True)
    def db():
        if 'db' not in g:
            g.db=sqlite3.connect(app.config['DATABASE'],timeout=30); g.db.row_factory=sqlite3.Row
            g.db.execute('PRAGMA foreign_keys=ON'); g.db.execute('PRAGMA journal_mode=WAL')
        return g.db
    def rows(sql,args=()): return [dict(r) for r in db().execute(sql,args).fetchall()]
    def one(sql,args=()):
        r=db().execute(sql,args).fetchone(); return dict(r) if r else None
    def run(sql,args=()): return db().execute(sql,args)
    def audit(action,target): run('INSERT INTO audit_logs VALUES(?,?,?,?,?)',(uid(),session.get('user_id'),action,target,now()))
    def notify(user,event,body,application=None,attachment=None):
        run('INSERT INTO notifications(id,user_id,application_id,event,subject,body,attachment_entry,created) VALUES(?,?,?,?,?,?,?,?)',(uid(),user,application,event,'Music Examinations — '+event,body,attachment,now()))
    def applicant_notice(a,event,body,attachment=None):
        s=one('SELECT * FROM students WHERE id=?',(a['student_id'],))
        recipients={a['created_by'],s['user_id']}
        recipients.update(r['parent_id'] for r in rows('SELECT parent_id FROM parent_students WHERE student_id=?',(s['id'],)))
        for u in recipients-{None}: notify(u,event,body,a['id'],attachment)
    def user():
        u=one('SELECT id,name,email,role,approval,verified,session_version FROM users WHERE id=?',(session.get('user_id'),))
        if not u: fail('Please log in.',401)
        if session.get('version')!=u['session_version']: fail('Session expired. Please log in again.',401)
        if u['approval']!='approved' or not u['verified']: fail('Email verification and Admin approval are required.',403)
        return u
    def auth(*roles):
        def decorator(fn):
            @wraps(fn)
            def inner(*args,**kwargs):
                g.user=user()
                if roles and g.user['role'] not in roles and g.user['role']!='superadmin': fail('You do not have permission.',403)
                return fn(*args,**kwargs)
            return inner
        return decorator
    def student_access(sid,admin=True):
        s=one('SELECT * FROM students WHERE id=?',(sid,))
        if not s: fail('Candidate not found.',404)
        u=user()
        if admin and u['role'] in ('admin','superadmin'): return s
        if u['role']=='student' and s['user_id']==u['id']: return s
        if u['role']=='parent' and one('SELECT 1 FROM parent_students WHERE parent_id=? AND student_id=?',(u['id'],sid)): return s
        fail('Candidate not found.',404)
    def application_access(aid):
        a=one('SELECT * FROM applications WHERE id=?',(aid,))
        if not a: fail('Application not found.',404)
        student_access(a['student_id']); return a
    def money(aid):
        summaries=rows('SELECT e.teacher_id,u.name,SUM(e.fee) due FROM application_subjects e JOIN users u ON u.id=e.teacher_id WHERE e.application_id=? GROUP BY e.teacher_id',(aid,))
        for t in summaries:
            p=one("SELECT COALESCE(SUM(amount),0) allocated,COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) paid FROM payment_allocations WHERE application_id=? AND teacher_id=? AND status IN ('pending','paid')",(aid,t['teacher_id']))
            t.update(p); t['remaining']=t['due']-t['allocated']; t['unpaid']=t['due']-t['paid']
        return {'teachers':summaries,**{k:sum(t[k] for t in summaries) for k in ('due','allocated','paid','remaining','unpaid')}}
    def entries(aid): return rows('SELECT e.*,s.name subject,l.name level,u.name teacher FROM application_subjects e JOIN subjects s ON s.id=e.subject_id JOIN subject_levels l ON l.id=e.level_id JOIN users u ON u.id=e.teacher_id WHERE e.application_id=? ORDER BY e.submitted,e.id',(aid,))
    def photo_bytes(upload_id):
        u=one('SELECT * FROM uploads WHERE id=?',(upload_id,))
        if not u: fail('Image not found.',404)
        raw=(Path(app.config['UPLOAD_FOLDER'])/u['path']).read_bytes()
        return cipher.decrypt(raw[:12],raw[12:],u['id'].encode())
    def require_upload(upload_id,kind,sid=None):
        r=one('SELECT * FROM uploads WHERE id=?',(upload_id,))
        if not r or r['kind']!=kind: fail('Please upload a valid '+kind+'.')
        if sid:
            if r['student_id']!=sid: fail('Image belongs to another candidate.',403)
        elif r['owner_id']!=user()['id']: fail('Signature belongs to another account.',403)
        return r
    def new_account(d,role,student_id=None):
        name=str(d.get('name','')).strip(); email=str(d.get('email','')).strip().lower(); password=d.get('password','')
        if not name or len(name)>150 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): fail('Name and valid email are required.')
        if not isinstance(password,str) or len(password)<15 or len(password)>128: fail('Use a password of 15 to 128 characters.')
        i=uid(); run('INSERT INTO users(id,name,email,password_hash,role,approval,verified,created) VALUES(?,?,?,?,?,?,?,?)',(i,name,email,generate_password_hash(password,method='scrypt'),role,'pending',0,now()))
        token=secrets.token_urlsafe(32); run('INSERT INTO verification_tokens VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),i,time.time()+86400))
        notify(i,'Verify your email',f"Hello {name}, verify your email within 24 hours: {app.config['BASE_URL']}/verify?token={token}. Admin approval is also required.")
        if role=='student':
            if student_id: run('UPDATE students SET user_id=? WHERE id=?',(i,student_id))
            else: run('INSERT INTO students(id,public_id,user_id,family_id,name,created) VALUES(?,?,?,?,?,?)',(uid(),uid('STU-'),i,i,name,now()))
        return i
    @app.teardown_appcontext
    def close(error):
        connection=g.pop('db',None)
        if connection: connection.close()
    @app.before_request
    def csrf():
        if request.path.startswith('/api/') and request.method in ('POST','PUT','PATCH','DELETE'):
            expected=session.get('csrf'); actual=request.headers.get('X-CSRF-Token','')
            if not expected or not secrets.compare_digest(expected,actual): fail('Invalid CSRF token. Refresh and retry.',403)
    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options']='nosniff'; response.headers['X-Frame-Options']='DENY'; response.headers['Referrer-Policy']='same-origin'
        response.headers['Cache-Control']='no-store' if request.path.startswith('/api/') else 'no-cache'
        response.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        if app.config['PRODUCTION']: response.headers['Strict-Transport-Security']='max-age=31536000; includeSubDomains'
        return response
    @app.errorhandler(Exception)
    def errors(e):
        db().rollback()
        if isinstance(e,sqlite3.IntegrityError): return jsonify(error='This record conflicts with existing data.'),409
        if hasattr(e,'code'): return jsonify(error=e.description),e.code
        app.logger.exception('Request failed'); return jsonify(error='The request could not be completed.'),500
    @app.get('/api/session')
    def get_session():
        if 'csrf' not in session: session['csrf']=secrets.token_urlsafe(32)
        u=one('SELECT id,name,email,role,approval,verified,session_version FROM users WHERE id=?',(session.get('user_id'),))
        if u and session.get('version')!=u['session_version']: u=None
        return jsonify(csrf=session['csrf'],user=u)
    @app.post('/api/resend-verification')
    def resend_verification():
        email=str(request.json.get('email','')).strip().lower(); u=one('SELECT * FROM users WHERE email=? AND verified=0',(email,))
        if u:
            recent=one("SELECT created FROM notifications WHERE user_id=? AND event='Verify your email' ORDER BY created DESC LIMIT 1",(u['id'],))
            if not recent or (datetime.now(timezone.utc)-datetime.fromisoformat(recent['created'])).total_seconds()>300:
                token=secrets.token_urlsafe(32); run('DELETE FROM verification_tokens WHERE user_id=?',(u['id'],)); run('INSERT INTO verification_tokens VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),u['id'],time.time()+86400)); notify(u['id'],'Verify your email',f"Verify within 24 hours: {app.config['BASE_URL']}/verify?token={token}"); db().commit()
        return jsonify(message='If an unverified account exists, a verification email will be queued. Requests are limited to once every five minutes.')
    @app.post('/api/register')
    def register():
        d=request.get_json(); role=d.get('role')
        if role not in ('student','parent'): fail('Invalid registration role.')
        new_account(d,role); db().commit(); return jsonify(message='Pending Approval. Check your email to verify your account.'),201
    @app.post('/api/contact')
    def contact():
        d=request.json; name=str(d.get('name','')).strip(); email=str(d.get('email','')).strip(); message=str(d.get('message','')).strip()
        if not name or len(name)>150 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or not 12<=len(message)<=5000: fail('Enter a name, valid email and a message of 12–5000 characters.')
        last=session.get('last_contact',0)
        if time.time()-last<60: fail('Please wait one minute before sending another inquiry.',429)
        i=uid(); run('INSERT INTO contacts VALUES(?,?,?,?,?,?)',(i,name,email,'Portal inquiry',message,now()))
        for admin in rows("SELECT id FROM users WHERE role IN ('admin','superadmin') AND approval='approved'"): notify(admin['id'],'Contact inquiry',f'{name} ({email}): {message}')
        session['last_contact']=time.time(); db().commit(); return jsonify(ok=True),201
    @app.post('/api/verify')
    def verify():
        digest=hashlib.sha256(str(request.json.get('token','')).encode()).hexdigest()
        r=one('SELECT * FROM verification_tokens WHERE digest=? AND expires>?',(digest,time.time()))
        if not r: fail('Verification link is invalid or expired.')
        account=one('SELECT requires_password_setup FROM users WHERE id=?',(r['user_id'],))
        if account['requires_password_setup']:
            password=request.json.get('password','')
            if not isinstance(password,str) or not 15<=len(password)<=128: fail('Set a password of 15–128 characters to activate this invited account.')
            run('UPDATE users SET password_hash=?,requires_password_setup=0 WHERE id=?',(generate_password_hash(password,method='scrypt'),r['user_id']))
        run('UPDATE users SET verified=1 WHERE id=?',(r['user_id'],)); run('DELETE FROM verification_tokens WHERE user_id=?',(r['user_id'],)); db().commit()
        return jsonify(message='Email verified. Admin approval is required before login.')
    @app.post('/api/login')
    def login():
        d=request.json; email=str(d.get('email','')).lower(); key=hashlib.sha256((str(request.remote_addr)+'|'+email).encode()).hexdigest(); attempt=one('SELECT * FROM login_attempts WHERE key=?',(key,))
        if attempt and attempt['window_start']>time.time()-900 and attempt['attempts']>=10: fail('Too many attempts. Try again in 15 minutes.',429)
        u=one('SELECT * FROM users WHERE email=?',(email,))
        if not u or not check_password_hash(u['password_hash'],str(d.get('password',''))):
            if not attempt or attempt['window_start']<=time.time()-900: run('INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=1,window_start=excluded.window_start',(key,time.time()))
            else: run('UPDATE login_attempts SET attempts=attempts+1 WHERE key=?',(key,))
            db().commit(); fail('Invalid email or password.',401)
        if not u['verified'] or u['approval']!='approved': fail('Email verification and Admin approval are required. Status: '+u['approval'],403)
        run('DELETE FROM login_attempts WHERE key=?',(key,)); db().commit(); session.clear(); session['user_id']=u['id']; session['version']=u['session_version']; session['csrf']=secrets.token_urlsafe(32); session.permanent=True
        return jsonify(csrf=session['csrf'],user={k:u[k] for k in ('id','name','email','role','verified','approval')})
    @app.post('/api/logout')
    def logout():
        if session.get('user_id'): run('UPDATE users SET session_version=session_version+1 WHERE id=?',(session['user_id'],)); db().commit()
        session.clear(); return jsonify(ok=True)
    @app.put('/api/account')
    @auth()
    def account_update():
        d=request.json; name=str(d.get('name','')).strip()
        if not name or len(name)>150: fail('A name of up to 150 characters is required.')
        if d.get('new_password'):
            old=one('SELECT password_hash FROM users WHERE id=?',(g.user['id'],))
            if not check_password_hash(old['password_hash'],str(d.get('current_password',''))): fail('Current password is incorrect.',403)
            password=d['new_password']
            if not isinstance(password,str) or not 15<=len(password)<=128: fail('New password must be 15–128 characters.')
            run('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=?',(generate_password_hash(password,method='scrypt'),g.user['id']))
            session['version']=g.user['session_version']+1
        run('UPDATE users SET name=? WHERE id=?',(name,g.user['id'])); audit('update account',g.user['id']); db().commit(); return jsonify(ok=True)
    @app.get('/api/catalog')
    @auth()
    def catalog(): return jsonify(subjects=rows('SELECT * FROM subjects WHERE active=1'),levels=rows('SELECT * FROM subject_levels ORDER BY ordinal'),teachers=rows("SELECT u.id,u.name,t.subject_id FROM teacher_subjects t JOIN users u ON u.id=t.teacher_id WHERE u.approval='approved' AND u.verified=1 AND u.role='teacher'"),minimum_age=int(one("SELECT value FROM settings WHERE key='minimum_age'")['value']))
    @app.post('/api/teacher-invitations')
    @auth('student','parent')
    def invite_teacher():
        d=request.json; email=str(d.get('email','')).strip().lower()
        if not one('SELECT 1 FROM subjects WHERE id=? AND active=1',(d.get('subject_id'),)): fail('Select a valid subject.')
        teacher=one('SELECT * FROM users WHERE email=?',(email,))
        if teacher and teacher['role']!='teacher': fail('This email cannot be invited as a teacher.',409)
        if not teacher:
            i=new_account({'name':d.get('name'),'email':email,'password':secrets.token_urlsafe(48)},'teacher'); run('INSERT INTO teachers VALUES(?)',(i,)); run('UPDATE users SET requires_password_setup=1 WHERE id=?',(i,))
        else: i=teacher['id']
        invitation=uid(); run('INSERT INTO teacher_invitations VALUES(?,?,?,?,?,?)',(invitation,g.user['id'],i,d['subject_id'],'pending',now()))
        for admin in rows("SELECT id FROM users WHERE role IN ('admin','superadmin') AND approval='approved'"): notify(admin['id'],'Teacher invitation review',f'{g.user["name"]} requested teacher eligibility for {email}. Review Teacher Invitations in your dashboard.')
        db().commit(); return jsonify(message='Teacher invited. Admin approval and subject eligibility are required before selection.'),201
    @app.get('/api/admin/invitations')
    @auth('admin')
    def invitations(): return jsonify(rows('SELECT i.*,u.name teacher,u.email,s.name subject FROM teacher_invitations i JOIN users u ON u.id=i.teacher_id JOIN subjects s ON s.id=i.subject_id ORDER BY i.created'))
    @app.post('/api/admin/invitations/<iid>')
    @auth('admin')
    def invitation_decide(iid):
        i=one('SELECT * FROM teacher_invitations WHERE id=?',(iid,)); status=request.json.get('status')
        if not i or i['status']!='pending': fail('Pending invitation not found.',404)
        if status not in ('approved','rejected'): fail('Invalid decision.')
        run('UPDATE teacher_invitations SET status=? WHERE id=?',(status,iid))
        if status=='approved': run('INSERT OR IGNORE INTO teacher_subjects VALUES(?,?)',(i['teacher_id'],i['subject_id'])); run("UPDATE users SET approval='approved' WHERE id=? AND approval='pending'",(i['teacher_id'],))
        notify(i['requested_by'],'Teacher invitation '+status,'Your teacher eligibility request was '+status+'. An approved teacher must also verify their email before selection.'); notify(i['teacher_id'],'Teacher invitation '+status,'Your subject eligibility request was '+status+'. Verify your email and set your initial password using the verification link if this is a new account.'); audit('teacher invitation '+status,iid); db().commit(); return jsonify(ok=True)
    @app.get('/api/students')
    @auth('student','parent','admin')
    def students():
        u=g.user
        if u['role'] in ('admin','superadmin'): result=rows('SELECT * FROM students')
        elif u['role']=='parent': result=rows('SELECT s.* FROM students s JOIN parent_students p ON p.student_id=s.id WHERE p.parent_id=?',(u['id'],))
        else: result=rows('SELECT * FROM students WHERE user_id=?',(u['id'],))
        for s in result: s['age']=age(s['dob']) if s['dob'] else None
        return jsonify(result)
    @app.post('/api/students')
    @auth('parent')
    def add_child():
        d=request.json; name=str(d.get('name','')).strip(); dob_date(d.get('dob'))
        if not name or len(name)>150: fail('Candidate name is required.')
        i=uid(); run('INSERT INTO students(id,public_id,family_id,name,dob,created) VALUES(?,?,?,?,?,?)',(i,uid('STU-'),g.user['id'],name,d['dob'],now())); run('INSERT INTO parent_students VALUES(?,?)',(g.user['id'],i)); db().commit(); return jsonify(id=i),201
    @app.post('/api/students/<sid>/transfer')
    @auth('parent')
    def transfer(sid):
        db().execute('BEGIN IMMEDIATE'); s=student_access(sid,False)
        if not s['dob'] or age(s['dob'])<=14: fail('Transfer is available only above 14 years old.')
        if s['user_id']: fail('This student already has an independent account.',409)
        i=new_account({**request.json,'name':s['name']},'student',sid); audit('transfer student login',sid); db().commit(); return jsonify(id=i,student_id=s['public_id'],approval='pending'),201
    @app.post('/api/uploads')
    @auth('student','parent','teacher')
    def upload():
        kind=request.form.get('kind'); sid=request.form.get('student_id') or None
        if sid: student_access(sid,False)
        if g.user['role']=='teacher' and (sid or kind!='signature'): fail('Only your approval signature can be uploaded.',403)
        if kind not in ('photo','signature'): fail('Invalid image type.')
        if g.user['role']!='teacher' and not sid: fail('Candidate is required.')
        f=request.files.get('file')
        if not f: fail('Select an image.')
        raw=f.read(5*1024*1024+1)
        if len(raw)>5*1024*1024: fail('Maximum image size is 5 MB.')
        try:
            im=Image.open(io.BytesIO(raw))
            if im.format not in ('JPEG','PNG') or im.width*im.height>16000000: fail('Use a PNG or JPEG up to 16 megapixels.')
            im.load(); im.thumbnail((1600,1600)); out=io.BytesIO(); im.convert('RGB').save(out,format='PNG')
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError): fail('The image is invalid.')
        i=uid(); name=i+'.enc'; nonce=os.urandom(12); (Path(app.config['UPLOAD_FOLDER'])/name).write_bytes(nonce+cipher.encrypt(nonce,out.getvalue(),i.encode()))
        run('INSERT INTO uploads VALUES(?,?,?,?,?,?,?)',(i,g.user['id'],sid,kind,name,'image/png',now())); db().commit(); return jsonify(id=i,url='/api/media/'+i),201
    @app.get('/api/media/<mid>')
    @auth()
    def media(mid):
        m=one('SELECT * FROM uploads WHERE id=?',(mid,))
        if not m: fail('Image not found.',404)
        u=g.user; allowed=u['role'] in ('admin','superadmin') or m['owner_id']==u['id']
        if not allowed and m['student_id'] and u['role'] in ('student','parent'): student_access(m['student_id']); allowed=True
        if not allowed and u['role']=='teacher': allowed=bool(one('SELECT 1 FROM applications a JOIN application_subjects e ON e.application_id=a.id WHERE e.teacher_id=? AND (a.photo_id=? OR a.signature_id=?)',(u['id'],mid,mid)))
        if not allowed and u['role'] in ('invigilator','examiner'): allowed=bool(one('SELECT 1 FROM applications a JOIN application_subjects e ON e.application_id=a.id JOIN admissions d ON d.entry_id=e.id JOIN session_staff f ON f.session_id=d.session_id WHERE f.user_id=? AND a.photo_id=?',(u['id'],mid)))
        if not allowed: fail('Image not found.',404)
        return send_file(io.BytesIO(photo_bytes(mid)),mimetype='image/png')
    @app.get('/api/applications')
    @auth('student','parent','admin')
    def applications():
        sid=request.args.get('student_id'); year=request.args.get('year')
        if sid: student_access(sid)
        result=[]; filters=[]; params=[]
        if g.user['role']=='student': filters.append('s.user_id=?'); params.append(g.user['id'])
        elif g.user['role']=='parent': filters.append('EXISTS(SELECT 1 FROM parent_students p WHERE p.student_id=s.id AND p.parent_id=?)'); params.append(g.user['id'])
        if sid: filters.append('a.student_id=?'); params.append(sid)
        if year: filters.append('a.year=?'); params.append(year)
        query='SELECT a.*,s.public_id,s.name FROM applications a JOIN students s ON s.id=a.student_id'+(' WHERE '+' AND '.join(filters) if filters else '')+' ORDER BY a.year DESC'
        for a in rows(query,params):
            a['entries']=entries(a['id']); a['balances']=money(a['id']); a['draft']=json.loads(a['draft']); result.append(a)
        return jsonify(result)
    @app.post('/api/applications')
    @auth('student','parent')
    def draft_create():
        d=request.json; student_access(d.get('student_id'),False)
        if d.get('year',date.today().year)!=date.today().year: fail('Applications can only be created for the current exam year.')
        old=one('SELECT id FROM applications WHERE student_id=? AND year=?',(d['student_id'],date.today().year))
        if old: return jsonify(old)
        i=uid(); run('INSERT INTO applications(id,student_id,year,created_by) VALUES(?,?,?,?)',(i,d['student_id'],date.today().year,g.user['id'])); db().commit(); return jsonify(id=i),201
    @app.put('/api/applications/<aid>/draft')
    @auth('student','parent')
    def save_draft(aid):
        a=application_access(aid)
        if a['status']!='draft': fail('Submitted applications cannot be overwritten.',409)
        run('UPDATE applications SET draft=? WHERE id=?',(json.dumps(request.json),aid)); db().commit(); return jsonify(ok=True)
    @app.delete('/api/applications/<aid>')
    @auth('student','parent')
    def delete_draft(aid):
        a=application_access(aid)
        if a['status']!='draft': fail('Only unsubmitted drafts can be deleted.')
        run('DELETE FROM applications WHERE id=?',(aid,)); db().commit(); return jsonify(ok=True)
    @app.post('/api/applications/<aid>/submit')
    @auth('student','parent')
    def submit(aid):
        run('BEGIN IMMEDIATE'); a=application_access(aid); s=student_access(a['student_id']); d=json.loads(a['draft'])
        if a['status']!='draft': fail('Application already submitted.',409)
        if a['year']!=date.today().year: fail('This application year is closed.')
        candidate_age=age(d.get('dob'))
        if candidate_age<int(one("SELECT value FROM settings WHERE key='minimum_age'")['value']): fail('Candidate must be at least six years old (or the configured minimum).')
        name=str(d.get('name','')).strip()
        if not name or len(name)>150: fail('Candidate name is required.')
        require_upload(d.get('photo_id'),'photo',s['id']); require_upload(d.get('signature_id'),'signature',s['id'])
        selected=d.get('subjects',[])
        if not selected or not isinstance(selected,list) or len(selected)>50: fail('Select between 1 and 50 subject levels.')
        seen=set(); validated=[]
        for item in selected:
            level=one('SELECT l.* FROM subject_levels l JOIN subjects s ON s.id=l.subject_id WHERE l.id=? AND l.subject_id=? AND s.active=1',(item.get('level_id'),item.get('subject_id')))
            if not level: fail('Select a valid level for each subject.')
            if level['id'] in seen: fail('Duplicate subject/level entries are not allowed.')
            seen.add(level['id'])
            teacher=one("SELECT 1 FROM teacher_subjects t JOIN users u ON u.id=t.teacher_id WHERE t.teacher_id=? AND t.subject_id=? AND u.approval='approved' AND u.verified=1 AND u.role='teacher'",(item.get('teacher_id'),item['subject_id']))
            if not teacher: fail('Select an eligible registered teacher for each subject.')
            validated.append((item,level))
        for item,l in validated:
            for p in rows('SELECT id FROM subject_levels WHERE subject_id=? AND ordinal<?',(l['subject_id'],l['ordinal'])):
                passed=one("SELECT 1 FROM results r JOIN application_subjects e ON e.id=r.entry_id JOIN applications a ON a.id=e.application_id WHERE a.student_id=? AND e.level_id=? AND r.status='published' AND r.outcome='pass'",(s['id'],p['id']))
                if not passed and p['id'] not in seen: fail('Include all missing prerequisite levels in a bundle.')
        timestamp=now()
        for item,l in validated:
            i=uid(); index=uid(str(a['year'])+'-')
            run('INSERT INTO application_subjects(id,application_id,subject_id,level_id,teacher_id,index_number,fee,submitted) VALUES(?,?,?,?,?,?,?,?)',(i,aid,l['subject_id'],l['id'],item['teacher_id'],index,l['fee'],timestamp))
            notify(item['teacher_id'],'Teacher confirmation request',f"Candidate: {name}; Student ID: {s['public_id']}; exam year: {a['year']}; level: {l['name']}; index: {index}. Review is available after confirmed payment. Open your Teacher Dashboard.",aid)
        run("UPDATE applications SET status='submitted',candidate_name=?,dob=?,photo_id=?,signature_id=?,guardian=?,submitted=? WHERE id=?",(name,d['dob'],d['photo_id'],d['signature_id'],str(d.get('guardian','')),timestamp,aid))
        run('UPDATE students SET name=?,dob=?,photo_id=? WHERE id=?',(name,d['dob'],d['photo_id'],s['id'])); applicant_notice(a,'Application submitted',f'Your {a["year"]} application is saved. Complete payment to enable teacher review.'); audit('submit application',aid); db().commit(); return jsonify(id=aid,balances=money(aid))
    @app.post('/api/applications/<aid>/payments')
    @auth('student','parent')
    def allocate(aid):
        run('BEGIN IMMEDIATE'); a=application_access(aid); d=request.json
        if a['status']=='draft': fail('Confirm the application first.')
        key=d.get('request_key')
        if not isinstance(key,str) or not 16<=len(key)<=100: fail('A unique payment request key is required.')
        old=one('SELECT * FROM payment_allocations WHERE request_key=?',(key,))
        if old:
            if old['application_id']!=aid: fail('Payment key conflict.',409)
            if any(old[k]!=d.get(k) for k in ('teacher_id','amount','method')): fail('Payment key was already used for a different allocation.',409)
            return jsonify(old)
        if d.get('method') not in ('card','etransfer','teacher'): fail('Invalid payment method.')
        amount=d.get('amount'); t=next((t for t in money(aid)['teachers'] if t['teacher_id']==d.get('teacher_id')),None)
        if isinstance(amount,bool) or not isinstance(amount,int) or amount<=0: fail('Amount must be positive whole cents.')
        if not t or amount>t['remaining'] or amount>money(aid)['remaining']: fail('Amount exceeds the teacher or overall remaining balance.')
        i=uid(); run('INSERT INTO payment_allocations(id,application_id,teacher_id,amount,method,request_key,created) VALUES(?,?,?,?,?,?,?)',(i,aid,t['teacher_id'],amount,d['method'],key,now()))
        checkout=None
        if d['method']=='card':
            try: checkout=app.config['PAYMENT_SERVICE'].create_checkout(allocation_id=i,amount_cents=amount,currency='CAD',teacher_id=t['teacher_id'])
            except PaymentUnavailable as e:
                run("UPDATE payment_allocations SET status='failed' WHERE id=?",(i,)); db().commit(); return jsonify(error=str(e),allocation_id=i),503
        applicant_notice(a,'Payment allocated',f'{amount/100:.2f} CAD allocated to {t["name"]} using {d["method"]}. Awaiting receipt verification.'); db().commit(); return jsonify(id=i,checkout=checkout,balances=money(aid)),201
    @app.get('/api/payments')
    @auth()
    def payment_list():
        result=[]
        for p in rows('SELECT p.*,u.name teacher FROM payment_allocations p JOIN users u ON u.id=p.teacher_id ORDER BY p.created DESC'):
            if g.user['role'] in ('admin','superadmin') or (g.user['role']=='teacher' and p['teacher_id']==g.user['id']): result.append(p); continue
            if g.user['role'] in ('student','parent'):
                try: application_access(p['application_id']); result.append(p)
                except Exception: pass
        return jsonify(result)
    @app.post('/api/payments/<pid>/confirm')
    @auth('admin','teacher')
    def confirm_payment(pid):
        run('BEGIN IMMEDIATE'); p=one('SELECT * FROM payment_allocations WHERE id=?',(pid,))
        if not p: fail('Payment not found.',404)
        if g.user['role']=='teacher' and (p['teacher_id']!=g.user['id'] or p['method']!='teacher'): fail('Only your own handover payments may be confirmed.',403)
        if p['status']!='pending': fail('Payment is no longer pending.',409)
        reference=str(request.json.get('reference','')).strip()
        if not reference or len(reference)>200: fail('A receipt/provider reference is required.')
        if p['method']=='card':
            try: verified=app.config['PAYMENT_SERVICE'].verify_payment(allocation_id=pid,provider_reference=reference)
            except PaymentUnavailable as e: fail(str(e),503)
            if not verified: fail('Provider has not confirmed this payment.',409)
        run("UPDATE payment_allocations SET status='paid',reference=? WHERE id=?",(reference,pid)); a=one('SELECT * FROM applications WHERE id=?',(p['application_id'],)); applicant_notice(a,'Payment confirmed',f'Receipt {reference}: {p["amount"]/100:.2f} CAD confirmed.'); audit('confirm payment',pid); db().commit(); return jsonify(balances=money(p['application_id']))
    @app.post('/api/payments/<pid>/cancel')
    @auth('student','parent','admin')
    def cancel_payment(pid):
        run('BEGIN IMMEDIATE'); p=one('SELECT * FROM payment_allocations WHERE id=?',(pid,))
        if not p: fail('Payment not found.',404)
        application_access(p['application_id'])
        if p['status']!='pending' or p['method']=='card': fail('Only unconfirmed manual allocations may be cancelled.')
        run("UPDATE payment_allocations SET status='failed' WHERE id=?",(pid,)); db().commit(); return jsonify(ok=True)
    @app.get('/api/teacher/requests')
    @auth('teacher')
    def teacher_requests():
        result=rows('SELECT e.*,a.candidate_name,a.student_id,a.year,a.photo_id,a.signature_id,s.public_id,l.name level,b.name subject FROM application_subjects e JOIN applications a ON a.id=e.application_id JOIN students s ON s.id=a.student_id JOIN subject_levels l ON l.id=e.level_id JOIN subjects b ON b.id=e.subject_id WHERE e.teacher_id=? ORDER BY e.submitted,e.id',(g.user['id'],))
        for r in result: r['payment_confirmed']=money(r['application_id'])['unpaid']==0
        return jsonify(result)
    @app.post('/api/teacher/requests/<eid>')
    @auth('teacher')
    def review(eid):
        run('BEGIN IMMEDIATE'); e=one('SELECT * FROM application_subjects WHERE id=? AND teacher_id=?',(eid,g.user['id']))
        if not e: fail('Request not found.',404)
        queue=rows("SELECT * FROM application_subjects WHERE teacher_id=? AND status IN ('pending','queried') ORDER BY submitted,id",(g.user['id'],))
        eligible=[q for q in queue if money(q['application_id'])['unpaid']==0]
        if not eligible or eligible[0]['id']!=eid: fail('Review the first paid request in FIFO order.',409)
        if e['status']=='queried': fail('Await the applicant response before further review.',409)
        d=request.json; state=d.get('status'); reason=str(d.get('reason','')).strip(); signature=d.get('signature_id')
        if state not in ('confirmed','rejected','queried'): fail('Invalid confirmation status.')
        if state=='confirmed': require_upload(signature,'signature')
        elif not reason: fail('A written reason or query is required.')
        run('UPDATE application_subjects SET status=?,reason=?,teacher_signature=? WHERE id=?',(state,reason,signature if state=='confirmed' else None,eid))
        if state=='rejected': run('INSERT INTO refund_jobs(id,subject_entry,amount,reason) VALUES(?,?,?,?)',(uid(),eid,e['fee'],reason))
        a=one('SELECT * FROM applications WHERE id=?',(e['application_id'],)); applicant_notice(a,'Teacher '+state,f'Index {e["index_number"]}: {state}. {reason}'); audit('teacher '+state,eid)
        if state=='confirmed': allocate_slots()
        db().commit(); return jsonify(ok=True)
    @app.post('/api/applications/<aid>/respond/<eid>')
    @auth('student','parent')
    def respond(aid,eid):
        application_access(aid); e=one("SELECT * FROM application_subjects WHERE id=? AND application_id=? AND status='queried'",(eid,aid)); text=str(request.json.get('response','')).strip()
        if not e or not text: fail('An open query and response are required.')
        run("UPDATE application_subjects SET status='pending',reason=? WHERE id=?",(text,eid)); notify(e['teacher_id'],'Query response',text,aid); db().commit(); return jsonify(ok=True)
    @app.post('/api/applications/<aid>/amend')
    @auth('student','parent')
    def amend_candidate(aid):
        run('BEGIN IMMEDIATE'); a=application_access(aid); d=request.json
        if not one("SELECT 1 FROM application_subjects WHERE application_id=? AND status='queried'",(aid,)): fail('A teacher correction request is required before amending a submitted application.',409)
        if one('SELECT 1 FROM application_subjects e LEFT JOIN results r ON r.entry_id=e.id LEFT JOIN admissions d ON d.entry_id=e.id WHERE e.application_id=? AND (r.entry_id IS NOT NULL OR d.used_at IS NOT NULL)',(aid,)): fail('An attended or evaluated application requires administrative recovery.',409)
        name=str(d.get('name','')).strip(); reason=str(d.get('reason','')).strip()
        if not name or len(name)>150 or not reason: fail('Candidate name and amendment reason are required.')
        if age(d.get('dob'))<int(one("SELECT value FROM settings WHERE key='minimum_age'")['value']): fail('Candidate does not meet the minimum age.')
        photo=d.get('photo_id') or a['photo_id']; signature=d.get('signature_id') or a['signature_id']; require_upload(photo,'photo',a['student_id']); require_upload(signature,'signature',a['student_id'])
        run('INSERT INTO application_amendments VALUES(?,?,?,?,?,?)',(uid(),aid,g.user['id'],json.dumps(a),reason,now()))
        run('UPDATE applications SET candidate_name=?,dob=?,photo_id=?,signature_id=? WHERE id=?',(name,d['dob'],photo,signature,aid)); run('UPDATE students SET name=?,dob=?,photo_id=? WHERE id=?',(name,d['dob'],photo,a['student_id']))
        run('DELETE FROM admissions WHERE entry_id IN (SELECT id FROM application_subjects WHERE application_id=?)',(aid,))
        run("UPDATE application_subjects SET status='pending',teacher_signature=NULL,reason=? WHERE application_id=? AND status!='rejected'",('Candidate amended: '+reason,aid))
        for e in entries(aid):
            if e['status']!='rejected': notify(e['teacher_id'],'Candidate amendment requires review',f'{name}, index {e["index_number"]}: {reason}. Previous endorsement and unconsumed admission were revoked; review the corrected candidate.',aid)
        applicant_notice(a,'Candidate amendment recorded','Your Student ID and subject indexes remain unchanged. All affected teachers must re-endorse the corrected candidate. Previous unconsumed admission codes were revoked.'); audit('amend candidate',aid); db().commit(); return jsonify(ok=True)
    def allocate_slots():
        pending=rows("SELECT e.*,a.student_id FROM application_subjects e JOIN applications a ON a.id=e.application_id LEFT JOIN admissions d ON d.entry_id=e.id WHERE e.status='confirmed' AND d.id IS NULL ORDER BY e.teacher_id,e.submitted,e.id")
        for e in pending:
            slots=rows('SELECT x.*,(SELECT COUNT(*) FROM admissions d JOIN application_subjects q ON q.id=d.entry_id WHERE d.session_id=x.id AND q.teacher_id=?) cohort FROM exam_sessions x WHERE (x.subject_id IS NULL OR x.subject_id=?) ORDER BY cohort DESC,x.start',(e['teacher_id'],e['subject_id']))
            for slot in slots:
                if datetime.fromisoformat(slot['start'])<datetime.now(timezone.utc): continue
                if one('SELECT COUNT(*) n FROM admissions WHERE session_id=?',(slot['id'],))['n']>=slot['capacity']: continue
                existing=rows('SELECT x.* FROM admissions d JOIN application_subjects q ON q.id=d.entry_id JOIN applications a ON a.id=q.application_id JOIN exam_sessions x ON x.id=d.session_id WHERE a.student_id=?',(e['student_id'],))
                start=datetime.fromisoformat(slot['start']); end=datetime.fromisoformat(slot['end'])
                if any(start<datetime.fromisoformat(x['end'])+timedelta(minutes=max(slot['buffer_minutes'],x['buffer_minutes'])) and end+timedelta(minutes=max(slot['buffer_minutes'],x['buffer_minutes']))>datetime.fromisoformat(x['start']) for x in existing): continue
                run('INSERT INTO admissions(id,entry_id,session_id,code) VALUES(?,?,?,?)',(uid(),e['id'],slot['id'],secrets.token_urlsafe(24)))
                a=one('SELECT * FROM applications WHERE id=?',(e['application_id'],)); applicant_notice(a,'Exam slot allocated',f'{slot["name"]}, {slot["start"]}, {slot["venue"]}. Your admission card is attached and available on the dashboard.',e['id']); break
    @app.post('/api/admin/allocate')
    @auth('admin')
    def allocate_api(): run('BEGIN IMMEDIATE'); allocate_slots(); audit('allocate exams','all'); db().commit(); return jsonify(ok=True)
    @app.get('/api/admissions')
    @auth()
    def admission_list():
        result=[]
        for r in rows('SELECT d.*,x.name session_name,x.start,x.end,x.venue,a.student_id,a.candidate_name,a.photo_id,e.application_id,e.index_number,l.name level,s.name subject FROM admissions d JOIN exam_sessions x ON x.id=d.session_id JOIN application_subjects e ON e.id=d.entry_id JOIN applications a ON a.id=e.application_id JOIN subject_levels l ON l.id=e.level_id JOIN subjects s ON s.id=e.subject_id'):
            u=g.user
            if u['role'] in ('admin','superadmin'): result.append(r)
            elif u['role'] in ('invigilator','examiner') and one('SELECT 1 FROM session_staff WHERE session_id=? AND user_id=?',(r['session_id'],u['id'])): result.append(r)
            elif u['role']=='teacher' and one('SELECT 1 FROM application_subjects WHERE id=? AND teacher_id=?',(r['entry_id'],u['id'])): r.pop('code'); result.append(r)
            elif u['role'] in ('student','parent'):
                try: student_access(r['student_id']); result.append(r)
                except Exception: pass
        return jsonify(result)
    @app.post('/api/invigilator/verify')
    @auth('invigilator')
    def consume():
        run('BEGIN IMMEDIATE'); r=one('SELECT d.*,x.start,x.end FROM admissions d JOIN exam_sessions x ON x.id=d.session_id JOIN session_staff f ON f.session_id=x.id WHERE d.code=? AND f.user_id=?',(request.json.get('code'),g.user['id']))
        if not r: fail('Admission not found in your assigned sessions.',404)
        t=datetime.now(timezone.utc)
        if r['used_at'] or t>datetime.fromisoformat(r['end']): fail('Admission code is used or expired.',409)
        if t<datetime.fromisoformat(r['start'])-timedelta(hours=1): fail('Admission is not yet open.',409)
        run('UPDATE admissions SET used_at=? WHERE id=? AND used_at IS NULL',(now(),r['id'])); audit('verify attendance',r['id']); db().commit(); return jsonify(ok=True)
    @app.post('/api/admin/admissions/<admission_id>/reschedule')
    @auth('admin')
    def reschedule(admission_id):
        run('BEGIN IMMEDIATE'); r=one('SELECT d.*,a.student_id,a.id application_id,e.subject_id FROM admissions d JOIN application_subjects e ON e.id=d.entry_id JOIN applications a ON a.id=e.application_id WHERE d.id=?',(admission_id,)); slot=one('SELECT * FROM exam_sessions WHERE id=?',(request.json.get('session_id'),))
        if not r or not slot: fail('Select a valid admission and session.',404)
        if r['used_at'] or one('SELECT 1 FROM results WHERE entry_id=?',(r['entry_id'],)): fail('Attended or evaluated examinations cannot be rescheduled.',409)
        if slot['subject_id'] and slot['subject_id']!=r['subject_id']: fail('The session is for a different subject.')
        if datetime.fromisoformat(slot['start'])<=datetime.now(timezone.utc): fail('Choose a future session.')
        if one('SELECT COUNT(*) n FROM admissions WHERE session_id=? AND id!=?',(slot['id'],admission_id))['n']>=slot['capacity']: fail('The target session is full.',409)
        existing=rows('SELECT x.* FROM admissions d JOIN application_subjects e ON e.id=d.entry_id JOIN applications a ON a.id=e.application_id JOIN exam_sessions x ON x.id=d.session_id WHERE a.student_id=? AND d.id!=?',(r['student_id'],admission_id))
        start=datetime.fromisoformat(slot['start']); end=datetime.fromisoformat(slot['end'])
        if any(start<datetime.fromisoformat(x['end'])+timedelta(minutes=max(slot['buffer_minutes'],x['buffer_minutes'])) and end+timedelta(minutes=max(slot['buffer_minutes'],x['buffer_minutes']))>datetime.fromisoformat(x['start']) for x in existing): fail('The session conflicts with another exam or its buffer.',409)
        reason=str(request.json.get('reason','')).strip()
        if not reason: fail('Rescheduling reason is required.')
        run('UPDATE admissions SET session_id=?,code=? WHERE id=?',(slot['id'],secrets.token_urlsafe(24),admission_id)); a=one('SELECT * FROM applications WHERE id=?',(r['application_id'],)); applicant_notice(a,'Exam rescheduled',f'{slot["name"]}, {slot["start"]}, {slot["venue"]}. {reason}. The old admission code is revoked. Use the attached replacement card.',r['entry_id']); audit('reschedule admission: '+reason,admission_id); db().commit(); return jsonify(ok=True)
    def examiner_scope(eid):
        if not one('SELECT 1 FROM admissions d JOIN session_staff f ON f.session_id=d.session_id WHERE d.entry_id=? AND f.user_id=?',(eid,user()['id'])): fail('Candidate not assigned to you.',404)
    @app.get('/api/results')
    @auth()
    def result_list():
        result=[]
        for r in rows('SELECT r.*,a.student_id,a.candidate_name,a.year,e.index_number,e.application_id,s.name subject,l.name level FROM results r JOIN application_subjects e ON e.id=r.entry_id JOIN applications a ON a.id=e.application_id JOIN subjects s ON s.id=e.subject_id JOIN subject_levels l ON l.id=e.level_id'):
            if g.user['role'] in ('admin','superadmin'): result.append(r)
            elif g.user['role']=='examiner':
                try: examiner_scope(r['entry_id']); result.append(r)
                except Exception: pass
            elif g.user['role'] in ('student','parent') and r['status']=='published':
                try: student_access(r['student_id']); result.append(r)
                except Exception: pass
        return jsonify(result)
    @app.put('/api/results/<eid>')
    @auth('examiner','admin')
    def save_result(eid):
        d=request.json; old=one('SELECT * FROM results WHERE entry_id=?',(eid,))
        if g.user['role']=='examiner':
            examiner_scope(eid)
            if d.get('status') not in ('draft','submitted') or old and old['status']!='draft': fail('Only draft results may be edited by the examiner.',409)
        if d.get('status') not in ('draft','submitted','published') or d.get('outcome') not in ('pass','fail'): fail('Invalid result status or outcome.')
        marks=d.get('marks')
        if isinstance(marks,bool) or not isinstance(marks,(float,int)) or not 0<=marks<=100 or not str(d.get('grade','')).strip(): fail('Marks 0–100 and grade are required.')
        if d['status']=='published' and not str(d.get('official_signature','')).strip(): fail('Official signature block is required to publish.')
        run('INSERT INTO results(entry_id,marks,grade,outcome,status,official_signature,updated,feedback) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(entry_id) DO UPDATE SET marks=excluded.marks,grade=excluded.grade,outcome=excluded.outcome,status=excluded.status,official_signature=excluded.official_signature,updated=excluded.updated,feedback=excluded.feedback',(eid,marks,d['grade'],d['outcome'],d['status'],d.get('official_signature',''),now(),str(d.get('feedback',''))[:5000]))
        a=one('SELECT a.* FROM applications a JOIN application_subjects e ON e.application_id=a.id WHERE e.id=?',(eid,))
        if d['status']=='published': applicant_notice(a,'Result published',f'Your result is available: {app.config["BASE_URL"]}/portal/results. Download the official PDF after login.')
        audit('result '+d['status'],eid); db().commit(); return jsonify(ok=True)
    @app.get('/api/applications/<aid>/candidate-card')
    @auth('admin')
    def candidate_card(aid):
        a=application_access(aid); s=student_access(a['student_id'])
        if a['status']=='draft': fail('Submit the candidate application before printing.')
        payload={'student_id':s['public_id'],'exam_year':a['year'],'date_of_birth':a['dob'],'subjects':[{'subject':e['subject'],'level':e['level'],'teacher':e['teacher'],'index_number':e['index_number']} for e in entries(aid)]}
        qr=qrcode.make(json.dumps(payload,separators=(',',':'),ensure_ascii=False)); qrout=io.BytesIO(); qr.save(qrout,format='PNG'); out=io.BytesIO(); c=canvas.Canvas(out,pagesize=(595,842)); c.drawImage(ImageReader(io.BytesIO(photo_bytes(a['photo_id']))),210,620,175,175,preserveAspectRatio=True,anchor='c'); c.setFont('Helvetica-Bold',min(18,490/max(stringWidth(a['candidate_name'],'Helvetica-Bold',1),1))); c.drawCentredString(297,585,a['candidate_name']); c.drawImage(ImageReader(qrout),52,55,490,490); c.save(); audit('print candidate card',aid); db().commit(); return send_file(io.BytesIO(out.getvalue()),mimetype='application/pdf',download_name='candidate-card.pdf')
    def admission_pdf(eid):
        r=one('SELECT a.*,e.index_number,e.teacher_signature,d.code,x.name session_name,x.start,x.venue,s.name subject,l.name level FROM application_subjects e JOIN applications a ON a.id=e.application_id JOIN admissions d ON d.entry_id=e.id JOIN exam_sessions x ON x.id=d.session_id JOIN subjects s ON s.id=e.subject_id JOIN subject_levels l ON l.id=e.level_id WHERE e.id=?',(eid,))
        if not r: fail('Admission not yet available.',404)
        out=io.BytesIO(); c=canvas.Canvas(out); c.setFont('Helvetica-Bold',20); c.drawString(48,790,'Music Examination Admission'); c.setFont('Helvetica',12)
        for n,text in enumerate([r['candidate_name'],r['subject']+' — '+r['level'],r['index_number'],r['session_name'],r['start'],r['venue'],'Admission code: '+r['code']]): c.drawString(48,750-n*24,text)
        for mid,x,label in [(r['photo_id'],48,'Candidate photo'),(r['signature_id'],228,'Candidate signature'),(r['teacher_signature'],408,'Teacher signature')]:
            c.drawString(x,510,label)
            if mid: c.drawImage(ImageReader(io.BytesIO(photo_bytes(mid))),x,345,140,140,preserveAspectRatio=True)
        qr=qrcode.make(r['code']); b=io.BytesIO(); qr.save(b,format='PNG'); c.drawImage(ImageReader(b),48,100,200,200); c.save(); return out.getvalue()
    app.admission_pdf=admission_pdf
    @app.get('/api/admissions/<eid>/pdf')
    @auth('student','parent','admin')
    def admission_download(eid):
        e=one('SELECT application_id FROM application_subjects WHERE id=?',(eid,))
        if not e: fail('Admission not found.',404)
        application_access(e['application_id']); return send_file(io.BytesIO(admission_pdf(eid)),mimetype='application/pdf',download_name='admission.pdf')
    @app.get('/api/results/<eid>/pdf')
    @auth('student','parent','admin')
    def result_pdf(eid):
        r=one("SELECT r.*,a.student_id,a.candidate_name,a.year,e.index_number,s.name subject,l.name level FROM results r JOIN application_subjects e ON e.id=r.entry_id JOIN applications a ON a.id=e.application_id JOIN subjects s ON s.id=e.subject_id JOIN subject_levels l ON l.id=e.level_id WHERE r.entry_id=? AND r.status='published'",(eid,))
        if not r: fail('Published result not found.',404)
        s=student_access(r['student_id']); out=io.BytesIO(); c=canvas.Canvas(out); c.setFont('Helvetica-Bold',22); c.drawString(48,780,'Official Music Examination Result'); c.setFont('Helvetica',12)
        for i,line in enumerate([r['candidate_name'],s['public_id'],str(r['year']),r['subject']+' / '+r['level'],r['index_number'],f"Marks: {r['marks']} / 100 | Grade: {r['grade']} | {r['outcome'].upper()}",'Official signature: '+r['official_signature'],'Published record updated: '+r['updated']]): c.drawString(48,730-i*35,line)
        c.save(); return send_file(io.BytesIO(out.getvalue()),mimetype='application/pdf',download_name='official-result.pdf')
    @app.post('/api/admin/ceremonies/allocate')
    @auth('admin')
    def ceremonies_allocate():
        run('BEGIN IMMEDIATE'); year=request.json.get('year',date.today().year)
        passing=rows("SELECT DISTINCT s.id,s.family_id FROM students s JOIN applications a ON a.student_id=s.id JOIN application_subjects e ON e.application_id=a.id JOIN results r ON r.entry_id=e.id WHERE a.year=? AND r.outcome='pass' AND r.status='published'",(year,)); families={}
        for s in passing: families.setdefault(s['family_id'],[]).append(s['id'])
        # Recompute atomically: a capacity failure rolls back the entire allocation.
        run('DELETE FROM ceremony_assignments WHERE year=?',(year,))
        for family,children in sorted(families.items(),key=lambda x:-len(x[1])):
            chosen=None
            for b in rows('SELECT * FROM ceremony_blocks ORDER BY start'):
                used=one('SELECT COUNT(*) n FROM ceremony_assignments WHERE block_id=?',(b['id'],))['n']
                if b['capacity']-used>=len(children): chosen=b; break
            if not chosen: fail('No ceremony block can hold a whole family. Add capacity; no family was split.',409)
            for sid in children:
                run('INSERT INTO ceremony_assignments VALUES(?,?,?)',(sid,year,chosen['id'])); a=one('SELECT * FROM applications WHERE student_id=? AND year=?',(sid,year)); applicant_notice(a,'Ceremony invitation',f'{chosen["name"]}: {chosen["start"]}, {chosen["venue"]}. Your family is scheduled together.')
        audit('allocate ceremonies',str(year)); db().commit(); return jsonify(ok=True)
    @app.get('/api/ceremonies')
    @auth('student','parent','admin')
    def ceremonies():
        result=[]
        for r in rows('SELECT c.*,b.name,b.start,b.venue,s.name candidate_name,s.public_id FROM ceremony_assignments c JOIN ceremony_blocks b ON b.id=c.block_id JOIN students s ON s.id=c.student_id'):
            try: student_access(r['student_id']); result.append(r)
            except Exception: pass
        return jsonify(result)
    @app.get('/api/admin/users')
    @auth('admin')
    def users(): return jsonify(rows('SELECT id,name,email,role,approval,verified FROM users ORDER BY created'))
    @app.post('/api/admin/users/<userid>/approval')
    @auth('admin')
    def approval(userid):
        u=one('SELECT * FROM users WHERE id=?',(userid,)); status=request.json.get('status')
        if not u: fail('User not found.',404)
        if g.user['role']=='admin' and u['role'] not in ('student','parent','teacher','examiner','invigilator'): fail('Super Administrator required.',403)
        if status not in ('approved','rejected'): fail('Invalid approval status.')
        if userid==g.user['id']: fail('You cannot change your own approval.')
        run('UPDATE users SET approval=? WHERE id=?',(status,userid)); notify(userid,'Account '+status,'Your account is '+status+'. Email verification is also required before login.'); audit('account '+status,userid); db().commit(); return jsonify(ok=True)
    @app.post('/api/admin/users')
    @auth('admin')
    def create_staff():
        d=request.json; role=d.get('role')
        permitted=('teacher','examiner','invigilator') if g.user['role']=='admin' else ('teacher','examiner','invigilator','admin','superadmin')
        if role not in permitted: fail('Role not permitted.',403)
        i=new_account(d,role)
        if role=='teacher': run('INSERT INTO teachers VALUES(?)',(i,))
        audit('create staff',i); db().commit(); return jsonify(id=i),201
    @app.post('/api/admin/users/<userid>/role')
    @auth('superadmin')
    def change_role(userid):
        role=request.json.get('role'); u=one('SELECT * FROM users WHERE id=?',(userid,))
        if not u: fail('User not found.',404)
        if userid==g.user['id']: fail('You cannot change your own role.')
        if role not in ('student','parent','teacher','examiner','invigilator','admin','superadmin'): fail('Invalid role.')
        if one('SELECT 1 FROM students WHERE user_id=? OR family_id=?',(userid,userid)) or one('SELECT 1 FROM parent_students WHERE parent_id=?',(userid,)): fail('This account owns candidate records. Use the account transfer workflow to preserve identity.',409)
        if role=='student': run('INSERT INTO students(id,public_id,user_id,family_id,name,created) VALUES(?,?,?,?,?,?)',(uid(),uid('STU-'),userid,userid,u['name'],now()))
        if role=='teacher': run('INSERT OR IGNORE INTO teachers VALUES(?)',(userid,))
        run('UPDATE users SET role=?,session_version=session_version+1 WHERE id=?',(role,userid)); audit('change role to '+role,userid); db().commit(); return jsonify(ok=True)
    @app.get('/api/admin/config')
    @auth('admin')
    def config_get(): return jsonify(subjects=rows('SELECT * FROM subjects'),levels=rows('SELECT * FROM subject_levels'),eligibility=rows('SELECT * FROM teacher_subjects'),sessions=rows('SELECT * FROM exam_sessions'),assignments=rows('SELECT * FROM session_staff'),blocks=rows('SELECT * FROM ceremony_blocks'),settings=rows('SELECT * FROM settings'))
    @app.post('/api/admin/config/<kind>')
    @auth('admin')
    def config_save(kind):
        d=request.json; i=d.get('id') or uid()
        def positive(k,zero=False):
            v=d.get(k)
            if type(v)!=int or v<(0 if zero else 1): fail(k+' must be a valid integer.')
            return v
        def timestamp(k):
            try:
                v=datetime.fromisoformat(d[k]); assert v.tzinfo is not None; return v.isoformat()
            except (KeyError,ValueError,AssertionError): fail(k+' must include a timezone offset.')
        if kind=='subjects':
            if not str(d.get('name','')).strip(): fail('Subject name required.')
            run('INSERT INTO subjects VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active',(i,d['name'],int(d.get('active',1))))
        elif kind=='levels': run('INSERT INTO subject_levels VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,fee=excluded.fee',(i,d['subject_id'],d['name'],positive('ordinal'),positive('fee',True)))
        elif kind=='eligibility': run('INSERT OR IGNORE INTO teacher_subjects VALUES(?,?)',(d['teacher_id'],d['subject_id']))
        elif kind=='sessions':
            start=timestamp('start'); end=timestamp('end')
            if datetime.fromisoformat(end)<=datetime.fromisoformat(start): fail('Session end must follow start.')
            if one('SELECT 1 FROM admissions WHERE session_id=?',(i,)): fail('A session with admissions cannot be edited; create a new session.',409)
            run('INSERT INTO exam_sessions VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,venue=excluded.venue,start=excluded.start,end=excluded.end,capacity=excluded.capacity,buffer_minutes=excluded.buffer_minutes,subject_id=excluded.subject_id',(i,d['name'],d['venue'],start,end,positive('capacity'),positive('buffer_minutes',True),d.get('subject_id') or None))
        elif kind=='assignments':
            u=one('SELECT role FROM users WHERE id=?',(d['user_id'],))
            if not u or u['role'] not in ('examiner','invigilator'): fail('Select an examiner or invigilator.')
            run('INSERT OR IGNORE INTO session_staff VALUES(?,?)',(d['session_id'],d['user_id']))
        elif kind=='blocks':
            if one('SELECT 1 FROM ceremony_assignments WHERE block_id=?',(i,)): fail('Allocated ceremony blocks cannot be edited.')
            run('INSERT INTO ceremony_blocks VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,venue=excluded.venue,start=excluded.start,capacity=excluded.capacity',(i,d['name'],d['venue'],timestamp('start'),positive('capacity')))
        elif kind=='settings':
            if d.get('key')!='minimum_age' or type(d.get('value'))!=int or d['value']<6: fail('Minimum age must be at least six.')
            run('UPDATE settings SET value=? WHERE key=?',(str(d['value']),d['key']))
        else: fail('Unknown configuration group.',404)
        audit('configure '+kind,i); db().commit(); return jsonify(id=i)
    @app.get('/api/notifications')
    @auth()
    def notifications():
        # Verification links are never exposed in dashboard logs.
        return jsonify(rows("SELECT id,event,subject,body,status,attempts,last_error,created FROM notifications WHERE user_id=? AND event!='Verify your email' ORDER BY created DESC",(g.user['id'],)))
    @app.get('/api/admin/email-logs')
    @auth('admin')
    def email_logs(): return jsonify(rows('SELECT id,user_id,application_id,event,status,attempts,next_attempt,last_error,created FROM notifications ORDER BY created DESC'))
    @app.post('/api/admin/email-logs/<nid>/retry')
    @auth('admin')
    def retry_email(nid): run("UPDATE notifications SET status='pending',attempts=0,next_attempt=0 WHERE id=? AND status='undeliverable'",(nid,)); audit('retry email',nid); db().commit(); return jsonify(ok=True)
    @app.get('/api/admin/refunds')
    @auth('admin')
    def refunds(): return jsonify(rows('SELECT * FROM refund_jobs'))
    @app.post('/api/admin/refunds/<rid>/complete')
    @auth('admin')
    def refund_complete(rid):
        run('BEGIN IMMEDIATE'); refund=one('SELECT r.*,e.application_id,e.teacher_id FROM refund_jobs r JOIN application_subjects e ON e.id=r.subject_entry WHERE r.id=?',(rid,))
        if not refund or refund['status']!='pending': fail('Pending refund not found.',404)
        reference=str(request.json.get('reference','')).strip()
        if not reference: fail('A verified refund receipt is required.')
        remaining=refund['amount']; allocations=[]
        for p in rows("SELECT p.*,COALESCE((SELECT SUM(r.amount) FROM refund_allocations r WHERE r.payment_id=p.id),0) refunded FROM payment_allocations p WHERE p.application_id=? AND p.teacher_id=? AND p.status='paid' ORDER BY p.created",(refund['application_id'],refund['teacher_id'])):
            amount=min(remaining,p['amount']-p['refunded'])
            if amount<=0: continue
            allocations.append((p,amount)); remaining-=amount
            if remaining==0: break
        if remaining: fail('Insufficient settled funds available for this refund.',409)
        for p,amount in allocations:
            # Stable keys make retry safe after a partial provider/network failure.
            if p['method']=='card':
                try: completed=app.config['PAYMENT_SERVICE'].refund(reference=p['reference'],amount_cents=amount,idempotency_key=rid+':'+p['id'])
                except PaymentUnavailable as e: fail(str(e),503)
                if not completed: fail('Provider refund was not confirmed.',409)
        for p,amount in allocations: run('INSERT INTO refund_allocations VALUES(?,?,?,?)',(uid(),rid,p['id'],amount))
        run("UPDATE refund_jobs SET status='completed',receipt_reference=?,completed_at=? WHERE id=?",(reference,now(),rid)); a=one('SELECT * FROM applications WHERE id=?',(refund['application_id'],)); applicant_notice(a,'Refund completed',f'Refund {refund["amount"]/100:.2f} CAD, receipt {reference}.'); audit('complete refund',rid); db().commit(); return jsonify(ok=True)
    @app.get('/api/admin/audit')
    @auth('superadmin')
    def audits(): return jsonify(rows('SELECT * FROM audit_logs ORDER BY created DESC LIMIT 1000'))
    @app.get('/')
    @app.get('/<path:path>')
    def frontend(path=''):
        dist=(ROOT.parent/'dist').resolve(); target=(dist/path).resolve()
        if target.is_relative_to(dist) and target.is_file(): return send_file(target)
        if (dist/'index.html').exists(): return send_file(dist/'index.html')
        return jsonify(message='Run npm run dev for the frontend.'),200
    with app.app_context():
        run('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied TEXT NOT NULL)'); db().commit()
        for migration in sorted((ROOT/'migrations').glob('*.sql')):
            if not one('SELECT 1 FROM schema_migrations WHERE name=?',(migration.name,)):
                escaped=migration.name.replace("'","''")
                db().executescript('BEGIN IMMEDIATE;\n'+migration.read_text()+f"\nINSERT INTO schema_migrations VALUES('{escaped}','{now()}');\nCOMMIT;")
    app.db=db
    return app

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument('command',choices=['serve','migrate','bootstrap']); parser.add_argument('--email'); args=parser.parse_args(); app=create_app()
    if args.command=='bootstrap':
        import getpass
        password=getpass.getpass('Super Administrator password (15+ characters): ')
        if not args.email or len(password)<15: raise SystemExit('Email and password of 15+ characters required.')
        with app.app_context():
            app.db().execute('INSERT INTO users(id,name,email,password_hash,role,approval,verified,created) VALUES(?,?,?,?,?,?,?,?)',(uid(),'Super Administrator',args.email.lower(),generate_password_hash(password,method='scrypt'),'superadmin','approved',1,now())); app.db().commit()
        print('Administrator created. No default credentials are shipped.')
    elif args.command=='serve':
        if app.config['PRODUCTION']:
            from waitress import serve
            serve(app,host='127.0.0.1',port=5000)
        else: app.run(host='127.0.0.1',port=5000,debug=False)





