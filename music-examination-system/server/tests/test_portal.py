import io
import json
import re
import secrets
from datetime import date,datetime,timedelta,timezone
from pathlib import Path
import pytest
from PIL import Image
from werkzeug.security import generate_password_hash
from app import create_app, now, uid
from worker import tick

PASSWORD='A long test passphrase 123!'

class Harness:
    def __init__(self,app): self.app=app; self.c=app.test_client(); self.csrf=self.c.get('/api/session').json['csrf']
    def call(self,path,method='GET',data=None):
        response=self.c.open('/api'+path,method=method,json=data,headers={'X-CSRF-Token':self.csrf})
        if response.is_json and response.json.get('csrf') if isinstance(response.json,dict) else False: self.csrf=response.json['csrf']
        return response
    def sql(self,sql,args=(),all=False):
        with self.app.app_context():
            cursor=self.app.db().execute(sql,args); result=cursor.fetchall() if all else cursor.fetchone(); self.app.db().commit(); return [dict(x) for x in result] if all else dict(result) if result else None
    def account(self,role='student',approved=True):
        email=uid()+'@example.test'; r=self.call('/register','POST',dict(name='Test Candidate',email=email,password=PASSWORD,role=role)); assert r.status_code==201,r.json
        u=self.sql('SELECT * FROM users WHERE email=?',(email,))
        if approved: self.sql("UPDATE users SET approval='approved',verified=1 WHERE id=?",(u['id'],))
        return u
    def staff(self,role):
        i=uid(); self.sql('INSERT INTO users(id,name,email,password_hash,role,approval,verified,created) VALUES(?,?,?,?,?,?,?,?)',(i,role,uid()+'@example.test',generate_password_hash(PASSWORD),role,'approved',1,now()))
        if role=='teacher': self.sql('INSERT INTO teachers VALUES(?)',(i,))
        return self.sql('SELECT * FROM users WHERE id=?',(i,))
    def login(self,u):
        with self.c.session_transaction() as s: s.clear(); s['csrf']=self.csrf
        r=self.call('/login','POST',dict(email=u['email'],password=PASSWORD)); assert r.status_code==200,r.json; return r
    def upload(self,sid=None,kind='photo'):
        b=io.BytesIO(); Image.new('RGB',(80,80),'white').save(b,format='PNG'); b.seek(0)
        d={'file':(b,'../../unsafe.png'),'kind':kind}
        if sid: d['student_id']=sid
        r=self.c.post('/api/uploads',data=d,headers={'X-CSRF-Token':self.csrf},content_type='multipart/form-data'); assert r.status_code==201,r.json; return r.json['id']
    def catalog(self,n=3):
        teachers=[self.staff('teacher') for _ in range(n)]; selections=[]
        for k,t in enumerate(teachers):
            sid=uid(); lid=uid(); self.sql('INSERT INTO subjects VALUES(?,?,1)',(sid,['Mridangam','Vocal','Violin'][k%3]+uid()[:4])); self.sql('INSERT INTO subject_levels VALUES(?,?,?,?,?)',(lid,sid,'Level 1',1,10000)); self.sql('INSERT INTO teacher_subjects VALUES(?,?)',(t['id'],sid)); selections.append(dict(subject_id=sid,level_id=lid,teacher_id=t['id']))
        return teachers,selections
    def application(self,subjects=None,dob='01/01/2000',submit=True):
        s=self.call('/students').json[0]; a=self.call('/applications','POST',{'student_id':s['id']}).json['id']; d={'name':s['name'],'dob':dob,'photo_id':self.upload(s['id']),'signature_id':self.upload(s['id'],'signature'),'subjects':subjects or self.catalog()[1]}; assert self.call(f'/applications/{a}/draft','PUT',d).status_code==200
        if submit: assert self.call(f'/applications/{a}/submit','POST',{}).status_code==200
        return s,a,d
    def pay(self,aid,teacher,amount=10000,method='teacher'):
        return self.call(f'/applications/{aid}/payments','POST',dict(teacher_id=teacher,amount=amount,method=method,request_key=uid()))
    def settle(self,aid): self.sql("UPDATE payment_allocations SET status='paid' WHERE application_id=?",(aid,))

@pytest.fixture
def h(tmp_path): return Harness(create_app({'TESTING':True,'DATABASE':str(tmp_path/'db.sqlite'),'UPLOAD_FOLDER':str(tmp_path/'media')}))

@pytest.mark.parametrize('role',['student','parent'])
def test_registration_minimal_and_approval_gate(h,role):
    u=h.account(role,False); assert u['approval']=='pending'; assert u['password_hash']!=PASSWORD; assert u['password_hash'].startswith('scrypt:')
    assert h.call('/login','POST',dict(email=u['email'],password=PASSWORD)).status_code==403
    h.sql("UPDATE users SET approval='approved' WHERE id=?",(u['id'],)); assert h.call('/login','POST',dict(email=u['email'],password=PASSWORD)).status_code==403
    n=h.sql("SELECT body FROM notifications WHERE user_id=? AND event='Verify your email'",(u['id'],)); token=re.search(r'token=([\w-]+)',n['body'])[1]
    assert h.call('/verify','POST',{'token':token}).status_code==200; assert h.call('/verify','POST',{'token':token}).status_code==400; h.login(u)

def test_identity_indexes_and_no_phantom_exams(h):
    u=h.account(); v=h.account(); h.login(u); s=h.call('/students').json[0]; assert h.call(f'/applications?year={date.today().year}').json==[]
    _,aid,_=h.application(); entries=h.call('/applications').json[0]['entries']; assert len(entries)==3 and len({e['index_number'] for e in entries})==3
    assert h.call('/students').json[0]['public_id']==s['public_id']; h.login(v); assert h.call('/students').json[0]['public_id']!=s['public_id']; assert h.call('/applications').json==[]
    assert h.call(f'/applications/{aid}/draft','PUT',{}).status_code==404
    h.login(u); h.sql('UPDATE applications SET year=? WHERE id=?',(date.today().year-1,aid)); assert h.call(f'/applications?year={date.today().year}').json==[]

@pytest.mark.parametrize('dob',['31/02/2010','29/02/2025','1/01/2010','2010-01-01','01/13/2010','01/01/3000'])
def test_invalid_dob(h,dob):
    h.login(h.account('parent')); assert h.call('/students','POST',dict(name='Child',dob=dob)).status_code==400

def test_parent_multiple_transfer_and_ownership(h):
    p=h.account('parent'); other=h.account('parent'); h.login(p)
    for dob in ['01/01/2000',f'01/01/{date.today().year-13}']:
        assert h.call('/students','POST',dict(name='Child',dob=dob)).status_code==201
    children=h.call('/students').json; assert len(children)==2
    older=next(s for s in children if s['age']>14); younger=next(s for s in children if s['age']<14)
    h.login(other); assert h.call(f'/students/{older["id"]}/transfer','POST',{}).status_code==404
    h.login(p); d=dict(email='transferred@example.test',password=PASSWORD)
    assert h.call(f'/students/{younger["id"]}/transfer','POST',d).status_code==400
    r=h.call(f'/students/{older["id"]}/transfer','POST',d); assert r.status_code==201 and r.json['student_id']==older['public_id']; assert r.json['approval']=='pending'
    assert h.call('/login','POST',d).status_code==403
    assert h.sql('SELECT COUNT(*) n FROM students')['n']==2

def test_upload_validation_private_encrypted_and_csrf(h):
    u=h.account(); v=h.account(); h.login(u); sid=h.call('/students').json[0]['id']; image=h.upload(sid)
    record=h.sql('SELECT * FROM uploads WHERE id=?',(image,)); raw=(Path(h.app.config['UPLOAD_FOLDER'])/record['path']).read_bytes(); assert not raw.startswith(b'\x89PNG') and '/' not in record['path']
    assert h.c.get('/api/media/'+image).status_code==200
    h.login(v); assert h.c.get('/api/media/'+image).status_code==404
    assert h.c.post('/api/register',json={}).status_code==403
    bad=h.c.post('/api/uploads',headers={'X-CSRF-Token':h.csrf},data={'student_id':h.call('/students').json[0]['id'],'kind':'photo','file':(io.BytesIO(b'<script>bad</script>'),'x.png')}); assert bad.status_code==400

def test_selection_prerequisites_duplicates_age_and_draft(h):
    h.login(h.account()); teachers,selections=h.catalog(1); s,a,d=h.application(selections,submit=False)
    assert h.call('/applications').json[0]['draft']==d
    invalid={**d,'dob':f'01/01/{date.today().year-4}'}; h.call(f'/applications/{a}/draft','PUT',invalid); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==400
    level2=uid(); h.sql('INSERT INTO subject_levels VALUES(?,?,?,?,?)',(level2,selections[0]['subject_id'],'Level 2',2,20000))
    d['subjects']=[{**selections[0],'level_id':level2}]; h.call(f'/applications/{a}/draft','PUT',d); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==400
    d['subjects']=[selections[0],selections[0]]; h.call(f'/applications/{a}/draft','PUT',d); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==400
    d['subjects']=[selections[0],{**selections[0],'level_id':level2}]; h.call(f'/applications/{a}/draft','PUT',d); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==200

def test_split_payments_overpayment_and_card_fail_closed(h):
    h.login(h.account()); teachers,selection=h.catalog(2); _,a,_=h.application(selection)
    r=h.pay(a,teachers[0]['id'],4000); assert r.status_code==201
    b=r.json['balances']; assert b['due']==20000 and b['remaining']==16000 and b['teachers'][0]['paid']==0
    assert h.pay(a,teachers[0]['id'],6001).status_code==400
    assert h.pay(a,teachers[1]['id'],10001).status_code==400
    assert h.pay(a,teachers[0]['id'],6000,'card').status_code==503
    assert h.call('/applications').json[0]['balances']['remaining']==16000
    assert h.pay(a,teachers[0]['id'],6000,'etransfer').status_code==201
    assert h.pay(a,teachers[1]['id'],10000).status_code==201
    assert h.pay(a,teachers[1]['id'],1).status_code==400
    assert h.call('/applications').json[0]['balances']['remaining']==0

def test_teacher_requests_scope_payment_gate_signature_and_refund(h):
    u=h.account(); h.login(u); teachers,selection=h.catalog(2); _,a,_=h.application(selection)
    for t in teachers: assert h.pay(a,t['id']).status_code==201
    for t in teachers: assert h.sql("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND event='Teacher confirmation request'",(t['id'],))['n']==1
    h.login(teachers[0]); r=h.call('/teacher/requests').json; assert len(r)==1; eid=r[0]['id']; other=h.sql('SELECT id FROM application_subjects WHERE teacher_id=?',(teachers[1]['id'],))['id']
    assert h.call('/teacher/requests/'+other,'POST',{'status':'confirmed'}).status_code==404
    assert h.call('/teacher/requests/'+eid,'POST',{'status':'confirmed'}).status_code==409
    h.settle(a); assert h.call('/teacher/requests/'+eid,'POST',{'status':'confirmed'}).status_code==400
    signature=h.upload(kind='signature'); assert h.call('/teacher/requests/'+eid,'POST',{'status':'confirmed','signature_id':signature}).status_code==200
    h.login(teachers[1]); assert h.call('/teacher/requests/'+other,'POST',{'status':'rejected'}).status_code==400
    assert h.call('/teacher/requests/'+other,'POST',{'status':'rejected','reason':'Needs preparation'}).status_code==200
    assert h.sql('SELECT amount FROM refund_jobs WHERE subject_entry=?',(other,))['amount']==10000

def test_qr_pdf_admin_only(h,monkeypatch):
    h.login(h.account()); s,a,d=h.application(); assert h.c.get(f'/api/applications/{a}/candidate-card').status_code==403
    import app as module
    real=module.qrcode.make; payload=[]
    def capture(value): payload.append(json.loads(value)); return real(value)
    monkeypatch.setattr(module.qrcode,'make',capture); h.login(h.staff('admin')); r=h.c.get(f'/api/applications/{a}/candidate-card'); assert r.status_code==200 and r.data.startswith(b'%PDF')
    assert payload[0]['student_id']==s['public_id']; assert payload[0]['exam_year']==date.today().year; assert payload[0]['date_of_birth']==d['dob']; assert len(payload[0]['subjects'])==3
    assert all(set(e)=={'subject','level','teacher','index_number'} for e in payload[0]['subjects'])
    import pypdfium2, zxingcpp
    doc=pypdfium2.PdfDocument(r.data); im=doc[0].render(scale=2).to_pil(); decoded=zxingcpp.read_barcode(im)
    assert decoded is not None and decoded.format==zxingcpp.BarcodeFormat.QRCode
    assert json.loads(decoded.text)==payload[0]

def test_email_three_retries(h):
    h.account(); called=[]
    def bad(app,record): called.append(record); raise RuntimeError('private secret')
    clock=[100000000000]
    for _ in range(4): tick(h.app,bad,lambda:clock[0]); clock[0]+=2000
    r=h.sql('SELECT * FROM notifications'); assert r['attempts']==4 and r['status']=='undeliverable'; assert len(called)==4; assert r['last_error']=='RuntimeError'

def test_migration_repeat_preserves_data(h):
    u=h.account(); create_app(dict(h.app.config)); assert h.sql('SELECT id FROM users WHERE id=?',(u['id'],))

def test_fifo_queries(h):
    teacher,sel=h.catalog(1); ids=[]
    for _ in range(2):
        h.login(h.account()); _,a,_=h.application(sel); h.pay(a,teacher[0]['id']); h.settle(a); ids.append(a)
    h.login(teacher[0]); queue=h.call('/teacher/requests').json
    assert h.call('/teacher/requests/'+queue[1]['id'],'POST',{'status':'queried','reason':'Question'}).status_code==409
    assert h.call('/teacher/requests/'+queue[0]['id'],'POST',{'status':'queried','reason':'Question'}).status_code==200
    assert h.call('/teacher/requests/'+queue[0]['id'],'POST',{'status':'rejected','reason':'Reason'}).status_code==409

def test_scoped_results_admission_and_ceremony(h):
    owner=h.account(); h.login(owner); teachers,sel=h.catalog(2); s,a,_=h.application(sel)
    entries=h.sql('SELECT * FROM application_subjects WHERE application_id=?',(a,),all=True)
    admin=h.staff('admin'); inv=h.staff('invigilator'); examiner=h.staff('examiner'); outsider=h.staff('examiner'); h.login(admin)
    t=datetime.now(timezone.utc)+timedelta(days=1)
    for n in range(2):
        d=dict(name='Session '+str(n),venue='Hall',start=(t+timedelta(hours=n*3)).isoformat(),end=(t+timedelta(hours=n*3+1)).isoformat(),capacity=10,buffer_minutes=15)
        assert h.call('/admin/config/sessions','POST',d).status_code==200
    h.sql("UPDATE application_subjects SET status='confirmed' WHERE application_id=?",(a,)); assert h.call('/admin/allocate','POST',{}).status_code==200
    admissions=h.call('/admissions').json; assert len(admissions)==2 and admissions[0]['session_id']!=admissions[1]['session_id']
    target=admissions[0]
    for u in [inv,examiner]: assert h.call('/admin/config/assignments','POST',dict(session_id=target['session_id'],user_id=u['id'])).status_code==200
    h.login(outsider); assert h.call('/admissions').json==[]; assert h.call('/results/'+target['entry_id'],'PUT',dict(marks=80,grade='A',outcome='pass',status='draft')).status_code==404
    h.login(examiner); assert len(h.call('/admissions').json)==1
    result=dict(marks=80,grade='A',outcome='pass',status='submitted'); assert h.call('/results/'+target['entry_id'],'PUT',result).status_code==200
    h.login(owner); assert h.call('/results').json==[]; assert h.c.get('/api/results/'+target['entry_id']+'/pdf').status_code==404
    h.login(admin); result.update(status='published',official_signature='Examination Board'); assert h.call('/results/'+target['entry_id'],'PUT',result).status_code==200
    assert h.call('/admin/config/blocks','POST',dict(name='Awards',venue='Main hall',start=t.isoformat(),capacity=10)).status_code==200
    assert h.call('/admin/ceremonies/allocate','POST',dict(year=date.today().year)).status_code==200
    h.login(owner); assert len(h.call('/ceremonies').json)==1; assert h.c.get('/api/results/'+target['entry_id']+'/pdf').data.startswith(b'%PDF')
    h.sql('UPDATE exam_sessions SET start=?,end=? WHERE id=?',((datetime.now(timezone.utc)-timedelta(minutes=10)).isoformat(),(datetime.now(timezone.utc)+timedelta(minutes=30)).isoformat(),target['session_id']))
    h.login(inv); assert h.call('/invigilator/verify','POST',{'code':target['code']}).status_code==200; assert h.call('/invigilator/verify','POST',{'code':target['code']}).status_code==409

def test_invalid_teacher_level_photo_and_duplicate_subject_validation(h):
    h.login(h.account()); teachers,sel=h.catalog(2); s,a,d=h.application(sel,submit=False)
    for patch in [{'photo_id':''},{'signature_id':''},{'subjects':[{**sel[0],'level_id':sel[1]['level_id']}]},{'subjects':[{**sel[0],'teacher_id':sel[1]['teacher_id']}]}]:
        h.call(f'/applications/{a}/draft','PUT',{**d,**patch}); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==400
    h.call(f'/applications/{a}/draft','PUT',d); assert h.call(f'/applications/{a}/submit','POST',{}).status_code==200
    assert h.call(f'/applications/{a}/submit','POST',{}).status_code==409

def test_exact_fourteen_transfer_blocked(h):
    h.login(h.account('parent')); t=date.today(); dob=f'{t.day:02}/{t.month:02}/{t.year-14}'
    sid=h.call('/students','POST',{'name':'Fourteen today','dob':dob}).json['id']; assert h.call(f'/students/{sid}/transfer','POST',{'email':'age@example.test','password':PASSWORD}).status_code==400

def test_payment_receipt_authorization_and_idempotency(h):
    owner=h.account(); h.login(owner); teachers,sel=h.catalog(2); _,a,_=h.application(sel)
    d=dict(teacher_id=teachers[0]['id'],amount=4000,method='teacher',request_key=uid()); p=h.call(f'/applications/{a}/payments','POST',d).json['id']; assert h.call(f'/applications/{a}/payments','POST',d).json['id']==p
    assert h.call(f'/applications/{a}/payments','POST',{**d,'amount':4001}).status_code==409
    assert h.call(f'/payments/{p}/confirm','POST',{'reference':'receipt'}).status_code==403
    h.login(teachers[1]); assert h.call(f'/payments/{p}/confirm','POST',{'reference':'receipt'}).status_code==403
    h.login(teachers[0]); assert h.call(f'/payments/{p}/confirm','POST',{'reference':'receipt'}).status_code==200
    assert h.call(f'/payments/{p}/confirm','POST',{'reference':'receipt'}).status_code==409
    h.login(owner); b=h.call('/applications').json[0]['balances']; assert b['paid']==4000 and b['allocated']==4000

def test_concurrent_overpayment_is_atomic(h):
    from concurrent.futures import ThreadPoolExecutor
    u=h.account(); h.login(u); teachers,sel=h.catalog(1); _,a,_=h.application(sel)
    def pay(n):
        client=h.app.test_client()
        with client.session_transaction() as session:
            session['user_id']=u['id']; session['version']=0; session['csrf']='concurrency-test'
        return client.post(f'/api/applications/{a}/payments',json=dict(teacher_id=teachers[0]['id'],amount=4000,method='teacher',request_key=uid()),headers={'X-CSRF-Token':'concurrency-test'}).status_code
    with ThreadPoolExecutor(max_workers=8) as pool: statuses=list(pool.map(pay,range(8)))
    assert statuses.count(201)==2 and statuses.count(400)==6
    assert h.sql('SELECT SUM(amount) n FROM payment_allocations WHERE application_id=?',(a,))['n']==8000

def test_logout_revokes_copied_session(h):
    u=h.account(); h.login(u); cookie=h.c.get_cookie('session').value; assert h.call('/logout','POST',{}).status_code==200
    stolen=h.app.test_client(); stolen.set_cookie('session',cookie); assert stolen.get('/api/students').status_code==401

def test_family_ceremony_constraint_survives_transfer(h):
    parent=h.account('parent'); h.login(parent); teachers,sel=h.catalog(1); child_ids=[]
    for n in range(2):
        sid=h.call('/students','POST',dict(name='Sibling '+str(n),dob='01/01/2000')).json['id']; child_ids.append(sid)
        a=uid(); h.sql("INSERT INTO applications(id,student_id,year,created_by,status,candidate_name) VALUES(?,?,?,?,'submitted',?)",(a,sid,date.today().year,parent['id'],'Sibling '+str(n))); e=uid(); h.sql("INSERT INTO application_subjects(id,application_id,subject_id,level_id,teacher_id,index_number,fee,status,submitted) VALUES(?,?,?,?,?,?,?,'confirmed',?)",(e,a,sel[0]['subject_id'],sel[0]['level_id'],teachers[0]['id'],uid(),10000,now())); h.sql("INSERT INTO results(entry_id,marks,grade,outcome,status,official_signature,updated) VALUES(?,80,'A','pass','published','Board',?)",(e,now()))
    assert h.call(f'/students/{child_ids[0]}/transfer','POST',dict(email='sibling@example.test',password=PASSWORD)).status_code==201
    h.login(h.staff('admin')); t=(datetime.now(timezone.utc)+timedelta(days=30)).isoformat()
    for n in range(2): assert h.call('/admin/config/blocks','POST',dict(name='Small '+str(n),venue='Hall',start=t,capacity=1)).status_code==200
    assert h.call('/admin/ceremonies/allocate','POST',{}).status_code==409; assert h.sql('SELECT COUNT(*) n FROM ceremony_assignments')['n']==0
    assert h.call('/admin/config/blocks','POST',dict(name='Family hall',venue='Hall',start=t,capacity=2)).status_code==200
    assert h.call('/admin/ceremonies/allocate','POST',{}).status_code==200
    assigned=h.sql('SELECT * FROM ceremony_assignments',all=True); assert len(assigned)==2 and len({r['block_id'] for r in assigned})==1

def test_manual_refund_completion(h):
    h.login(h.account()); teachers,sel=h.catalog(1); _,a,_=h.application(sel); h.pay(a,teachers[0]['id']); h.settle(a); h.login(teachers[0]); e=h.call('/teacher/requests').json[0]['id']; assert h.call('/teacher/requests/'+e,'POST',dict(status='rejected',reason='Not ready')).status_code==200
    h.login(h.staff('admin')); refund=h.call('/admin/refunds').json[0]; assert h.call(f'/admin/refunds/{refund["id"]}/complete','POST',dict(reference='Bank refund receipt 12')).status_code==200
    assert h.sql('SELECT SUM(amount) n FROM refund_allocations')['n']==10000
    assert h.call(f'/admin/refunds/{refund["id"]}/complete','POST',dict(reference='repeat')).status_code==404

def test_teacher_invitation_requires_admin_eligibility_and_password_setup(h):
    h.login(h.account()); _,selection=h.catalog(1); d=dict(name='Invited Teacher',email='invited@example.test',subject_id=selection[0]['subject_id'])
    assert h.call('/teacher-invitations','POST',d).status_code==201
    teacher=h.sql('SELECT * FROM users WHERE email=?',(d['email'],)); assert teacher['approval']=='pending' and teacher['requires_password_setup']==1
    assert not any(t['id']==teacher['id'] for t in h.call('/catalog').json['teachers'])
    token=re.search(r'token=([\w-]+)',h.sql("SELECT body FROM notifications WHERE user_id=? AND event='Verify your email'",(teacher['id'],))['body'])[1]
    assert h.call('/verify','POST',dict(token=token)).status_code==400
    assert h.call('/verify','POST',dict(token=token,password=PASSWORD)).status_code==200
    h.login(h.staff('admin')); invitation=h.call('/admin/invitations').json[0]; assert h.call('/admin/invitations/'+invitation['id'],'POST',dict(status='approved')).status_code==200
    h.login(teacher); assert any(t['id']==teacher['id'] for t in h.call('/catalog').json['teachers'])

def test_candidate_amendment_reendorsement_preserves_identity(h):
    owner=h.account(); h.login(owner); teachers,sel=h.catalog(2); s,a,d=h.application(sel)
    for t in teachers: h.pay(a,t['id'])
    h.settle(a); original=h.sql('SELECT id,index_number FROM application_subjects WHERE application_id=? ORDER BY id',(a,),all=True)
    h.login(teachers[0]); e=h.call('/teacher/requests').json[0]; assert h.call('/teacher/requests/'+e['id'],'POST',dict(status='queried',reason='Please correct spelling')).status_code==200
    h.login(owner); assert h.call('/applications/'+a+'/amend','POST',dict(name='Corrected Name',dob=d['dob'],reason='Spelling correction')).status_code==200
    assert h.sql('SELECT id,index_number FROM application_subjects WHERE application_id=? ORDER BY id',(a,),all=True)==original
    assert h.sql('SELECT public_id FROM students WHERE id=?',(s['id'],))['public_id']==s['public_id']
    assert h.sql('SELECT COUNT(*) n FROM application_amendments')['n']==1
    assert all(e['status']=='pending' for e in h.call('/applications').json[0]['entries'])

def test_account_password_change_revokes_other_session(h):
    u=h.account(); h.login(u); old_cookie=h.c.get_cookie('session').value
    assert h.call('/account','PUT',dict(name='Updated',current_password=PASSWORD,new_password='A completely new passphrase 123')).status_code==200
    assert h.call('/students').status_code==200
    copied=h.app.test_client(); copied.set_cookie('session',old_cookie); assert copied.get('/api/students').status_code==401

def test_rescheduling_revokes_previous_code(h):
    h.login(h.account()); _,a,_=h.application(); e=h.sql('SELECT id FROM application_subjects WHERE application_id=?',(a,))['id']; h.sql("UPDATE application_subjects SET status='confirmed' WHERE id=?",(e,)); h.login(h.staff('admin')); t=datetime.now(timezone.utc)+timedelta(days=5); sessions=[]
    for n in range(2):
        sessions.append(h.call('/admin/config/sessions','POST',dict(name=str(n),venue='Hall',start=(t+timedelta(days=n)).isoformat(),end=(t+timedelta(days=n,hours=1)).isoformat(),capacity=5,buffer_minutes=15)).json['id'])
    assert h.call('/admin/allocate','POST',{}).status_code==200
    admission=h.call('/admissions').json[0]; target=next(s for s in sessions if s!=admission['session_id'])
    assert h.call('/admin/admissions/'+admission['id']+'/reschedule','POST',dict(session_id=target,reason='Venue change')).status_code==200
    changed=h.call('/admissions').json[0]; assert changed['code']!=admission['code'] and changed['session_id']==target


