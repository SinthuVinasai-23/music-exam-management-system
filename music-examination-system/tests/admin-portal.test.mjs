import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createAuthServer} from '../auth-server/server.mjs';
test('connected admin workflows persist and enforce roles',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'icfa-admin-'));const service=await createAuthServer({dataDir:dir,config:{APP_URL:'http://127.0.0.1:5175',PREVIEW_ADMIN_ACCESS:'true'},sendEmail:async()=>{}});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
 function client(){let cookie='',csrf='';return async(route,data,expected=200,method=data?'POST':'GET')=>{const r=await fetch(base+'/api/portal/'+route,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},body:data?JSON.stringify(data):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const result=await r.json();csrf=result.csrf||csrf;assert.equal(r.status,expected,JSON.stringify(result));return result;};}
 const admin=client(),student=client(),examiner=client(),stranger=client();try{
  await admin('session');await admin('preview-admin-login',{email:'x',password:'x'});await stranger('admin/overview',null,401);
  await student('session');await student('register',{role:'student',firstName:'Admin',lastName:'Workflow',dateOfBirth:'2000-01-01',email:'adminworkflow@example.com',phone:'12345',password:'Music12345',confirmPassword:'Music12345'},201);await student('verify',{code:'123456'});await student('admin/overview',null,403);
  const cat=await student('catalog'),studentId=cat.student.student_id;const app=(await student('applications',{studentId,preferredMedium:'English',preferredLocation:'Ajex',entries:[{subjectId:'mridangam',grade:'Grade 1',teacherId:'teacher-miruthangam'}]},201)).application;
  let snapshot=await admin('admin/venue',{name:'Test Concert Hall',location:'Test City',capacity:2,status:'Active'});const venue=snapshot.data.venues.find(v=>v.name==='Test Concert Hall');
  assert.ok((await student('catalog')).config.locations.includes('Test City'));
  snapshot=await admin('admin/slot',{name:'Morning Test',venueId:venue.id,date:'2026-11-02',start:'09:00',end:'10:00',capacity:2});const slot=snapshot.data.slots.find(s=>s.name==='Morning Test');
  await admin('admin/slot',{name:'Overlap',venueId:venue.id,date:'2026-11-02',start:'09:30',end:'10:30',capacity:2},409);
  snapshot=await admin('admin/staff',{name:'Test Examiner',email:'newexaminer@example.com',role:'examiner',password:'Examiner123',status:'Active'});const staff=snapshot.staff.find(s=>s.email==='newexaminer@example.com');assert.ok(staff);assert.equal(staff.password_hash,undefined);
  await admin('admin/workflow',{applicationId:app.id,decision:'rejected'},400);
  snapshot=await admin('admin/workflow',{applicationId:app.id,decision:'approved',examinerId:staff.id,slotId:slot.id,notes:'Private reviewer note'});assert.equal(snapshot.applications.find(a=>a.id===app.id).applicationStatus,'approved');assert.equal((await student('applications')).applications[0].entries[0].examDate,'2026-11-02');
  await examiner('session');await examiner('staff-login',{email:'newexaminer@example.com',password:'Examiner123'});
  await examiner('examiner-marks',{applicationId:app.id,subject:'Miruthangam',level:'Grade 1',component:'theory',mark:'70'});
  const item=app.entries[0].id;await admin('admin/publication',{itemId:item,published:true},400);
  await examiner('examiner-marks',{applicationId:app.id,subject:'Miruthangam',level:'Grade 1',component:'practical',mark:'90'});
  snapshot=await admin('admin/publication',{itemId:item,published:true,feedback:'Reviewed'});assert.equal(snapshot.results.find(r=>r.id===item).average,80);assert.equal((await student('catalog')).student.results[0].score,80);
  snapshot=await admin('admin/ceremony',{name:'Awards Test',venueId:venue.id,date:'2026-12-01',start:'10:00',end:'12:00',capacity:2});const ceremony=snapshot.data.ceremonies.find(c=>c.name==='Awards Test');await admin('admin/attendance',{studentId,sessionId:ceremony.id,status:'Attending',seat:'A-01',award:'Merit',checkedIn:true});const pass=(await student('ceremony-pass?studentId='+encodeURIComponent(studentId))).pass;assert.equal(pass.venue,'Test Concert Hall');assert.equal(pass.seat,'A-01');
  await admin('admin/venue',{id:venue.id,remove:true},409);snapshot=await admin('admin/overview');assert.ok(snapshot.data.emails.length>=3);assert.ok(snapshot.data.emails.every(e=>e.status==='Preview queued'));const email=snapshot.data.emails[0];snapshot=await admin('admin/email-retry',{id:email.id});assert.equal(snapshot.data.emails[0].attempts,1);
  await admin('admin/staff',{id:staff.id,name:staff.name,email:staff.email,role:'examiner',status:'Inactive'});await examiner('examiner-marks?applicationId='+app.id,null,401);
  assert.ok((await admin('admin/overview')).audit.some(e=>e.action==='admin-attendance'));
 }finally{await new Promise(r=>service.server.close(r));}
});
