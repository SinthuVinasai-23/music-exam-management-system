import crypto from 'node:crypto';
import {teacherRecords} from '../src/student/data/studentData.js';
const defaults=()=>({fees:[{id:'foundation',name:'Foundation Grades 1–3',amount:120},{id:'intermediate',name:'Intermediate Grades 4–6',amount:185},{id:'advanced',name:'Advanced Grades 7–8',amount:240},{id:'diploma',name:'Diploma',amount:450}],levels:[],venues:[{id:'ajex',name:'Ajex Examination Centre',location:'Ajex',capacity:100,status:'Active',type:'Examination Hall'},{id:'scarborough',name:'Scarborough Arts Centre',location:'Scarborough',capacity:120,status:'Active',type:'Examination Hall'},{id:'brampton',name:'Brampton Music Centre',location:'Brampton',capacity:80,status:'Active',type:'Examination Hall'}],slots:[],ceremonies:[],attendance:{},workflows:{},staffMeta:{},emails:[],settings:{autoPublish:false,earlyAccess:false,buffer:15,breakInterval:4,start:'08:00',end:'18:00',days:['Mon','Tue','Wed','Thu','Fri'],overtime:true}});
export function createAdminPortal({db,value,put,students,safeStudent,application,audit,clock,failure,hash,recompute,subjectDirectory}){
 const all=(q,...a)=>db.prepare(q).all(...a),get=(q,...a)=>db.prepare(q).get(...a),run=(q,...a)=>db.prepare(q).run(...a);
 const read=()=>({...defaults(),...value('admin_portal_state',{})});
 function resultRows(){return all('SELECT i.*,a.student_id,a.first_name,a.last_name,m.theory,m.practical,r.status publication,r.feedback FROM exam_items i JOIN exam_applications a ON a.id=i.application_id LEFT JOIN examiner_component_marks m ON m.item_id=i.id LEFT JOIN learning_results r ON r.id=(\'admin-result-\'||i.id) ORDER BY a.created DESC').map(r=>({...r,name:r.first_name+' '+r.last_name,subject:subjectDirectory().find(s=>s.id===r.subject_id)?.name||r.subject_id,examiner:read().workflows[r.application_id]?.examinerId||'examiner',average:r.theory!=null&&r.practical!=null?Math.round((r.theory+r.practical)*50)/100:null,publication:r.publication||'draft'}));}
 function snapshot(){const saved=read();return {data:saved,applications:all('SELECT * FROM exam_applications ORDER BY created DESC').map(r=>({...application(r),workflow:saved.workflows[r.id]||{}})),students:students().map(safeStudent),parents:value('musicDemoParents',[]).map(({password,confirmPassword,...p})=>p),staff:all('SELECT id,name,email,role FROM exam_staff').map(s=>({...s,...saved.staffMeta[s.id],status:saved.staffMeta[s.id]?.status||'Active'})),results:resultRows(),audit:all('SELECT * FROM exam_audit ORDER BY created DESC,id DESC LIMIT 250'),config:value('exam_config')};}
 const clean=(v,max=150)=>String(v||'').trim().slice(0,max);
 function validateTime(start,end){if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||start>=end)failure(400,'Choose a valid start and end time.');}
 function queueEmail(saved,recipient,event,detail){saved.emails.unshift({id:crypto.randomUUID(),recipient,event,detail,status:'Preview queued',attempts:0,created:new Date(clock()).toISOString()});}
 return async function handle({route,req,data,reply,requireRole,state}){
  if(!route.startsWith('admin/'))return false;
  requireRole('admin');
  if(route==='admin/overview'&&req.method==='GET'){reply(200,snapshot());return true;}
  if(req.method!=='POST')failure(405,'Method not allowed.');
  const saved=read(),kind=route.slice(6),id=data.id||crypto.randomUUID();
  db.exec('BEGIN');
  try{
   if(['venue','slot','level','ceremony'].includes(kind)){
    const key={venue:'venues',slot:'slots',level:'levels',ceremony:'ceremonies'}[kind];
    if(data.remove){
      if(kind==='venue'&&(saved.slots.some(s=>s.venueId===id)||saved.ceremonies.some(s=>s.venueId===id)))failure(409,'This venue is used by a time slot or ceremony.');
      if(kind==='slot'&&Object.values(saved.workflows).some(w=>w.slotId===id))failure(409,'This time slot has assigned applications.');
      if(kind==='ceremony'&&Object.values(saved.attendance).some(a=>a.sessionId===id))failure(409,'This ceremony has assigned attendees.');
      saved[key]=saved[key].filter(r=>r.id!==id);
    }else{
     if(!clean(data.name))failure(400,'Enter a name.');
     const record={id,name:clean(data.name)};
     if(kind==='venue'){if(!clean(data.location)||!Number.isInteger(Number(data.capacity))||Number(data.capacity)<1)failure(400,'Enter a location and a positive whole-number capacity.');Object.assign(record,{location:clean(data.location),capacity:Number(data.capacity),status:data.status==='Maintenance'?'Maintenance':'Active',type:clean(data.type)||'Examination Hall'});}
     if(kind==='slot'||kind==='ceremony'){
      const venue=saved.venues.find(v=>v.id===data.venueId&&v.status==='Active');if(!venue)failure(400,'Select an active venue.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||Number.isNaN(Date.parse(data.date)))failure(400,'Choose a valid date.');validateTime(data.start,data.end);
      if(kind==='slot') {
        const minutes=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
        if(saved.settings.overtime&&(data.start<saved.settings.start||data.end>saved.settings.end))failure(400,'The slot must fit inside the standard exam window.');
        const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(data.date+'T12:00:00Z').getUTCDay()];
        if(!saved.settings.days.includes(day))failure(400,'This date is not an operating day.');
        if(saved.slots.some(s=>s.id!==id&&s.venueId===data.venueId&&s.date===data.date&&minutes(data.start)<minutes(s.end)+Number(saved.settings.buffer)&&minutes(s.start)<minutes(data.end)+Number(saved.settings.buffer)))failure(409,'This venue already has an overlapping slot or required buffer.');
      }
      const capacity=Number(data.capacity||venue.capacity);if(!Number.isInteger(capacity)||capacity<1||capacity>venue.capacity)failure(400,'Capacity must be between 1 and the venue capacity.');
      Object.assign(record,{venueId:venue.id,date:data.date,start:data.start,end:data.end,capacity,subjectId:data.subjectId||'',level:clean(data.level)});
     }
     if(kind==='ceremony'&&Object.values(saved.attendance).filter(a=>a.sessionId===id&&a.status==='Attending').length>record.capacity)failure(409,'Capacity is below the current attendance count.');
     if(kind==='level')Object.assign(record,{rank:clean(data.rank),description:clean(data.description,1500)});
     const index=saved[key].findIndex(r=>r.id===id);if(index<0)saved[key].push(record);else saved[key][index]=record;
    }
   }else if(kind==='settings'){
    const settings=data.settings;if(!settings||!Array.isArray(data.fees)||!Array.isArray(settings.days)||!settings.days.length)failure(400,'Provide settings, fees and operating days.');validateTime(settings.start,settings.end);
    if(data.fees.some(f=>!clean(f.name)||!Number.isFinite(Number(f.amount))||Number(f.amount)<0))failure(400,'Enter valid non-negative fees.');
    if(Number(settings.buffer)<0||Number(settings.buffer)>60||Number(settings.breakInterval)<1)failure(400,'Check the buffer and break interval.');
    saved.fees=data.fees.map(f=>({id:f.id||crypto.randomUUID(),name:clean(f.name),amount:Number(f.amount)}));saved.settings={...saved.settings,...settings,buffer:Number(settings.buffer),breakInterval:Number(settings.breakInterval)};
   }else if(kind==='workflow'){
    const app=get('SELECT * FROM exam_applications WHERE id=?',data.applicationId);if(!app)failure(404,'Application not found.');
    if(!['approved','changes-required','rejected','review'].includes(data.decision))failure(400,'Choose a decision.');
    if(['rejected','changes-required'].includes(data.decision)&&!clean(data.note))failure(400,'A reason is required for this decision.');
    const examiner=data.examinerId?get("SELECT id FROM exam_staff WHERE id=? AND role='examiner'",data.examinerId):null;if(data.examinerId&&!examiner)failure(400,'Select an examiner.');
    if(data.slotId){const slot=saved.slots.find(s=>s.id===data.slotId);if(!slot)failure(400,'Select an examination slot.');const used=Object.entries(saved.workflows).filter(([key,w])=>key!==app.id&&w.slotId===data.slotId).length;if(used>=slot.capacity)failure(409,'The selected slot is full.');}
    saved.workflows[app.id]={examinerId:data.examinerId||'',slotId:data.slotId||'',notes:clean(data.notes,3000),decision:data.decision,updated:new Date(clock()).toISOString()};
    if(data.decision!=='review'){run('UPDATE exam_items SET status=?,review_note=?,reviewed=?,updated=? WHERE application_id=?',data.decision,clean(data.note,1000),clock(),clock(),app.id);recompute(app.id);}
    const candidate=students().find(s=>s.student_id===app.student_id);queueEmail(saved,candidate?.email||app.student_id,'Application '+data.decision,clean(data.note)||'Your application record has been updated.');
   }else if(kind==='staff'){
    const role=data.role;if(!['teacher','examiner','invigilator','admin'].includes(role))failure(400,'Select a staff role.');
    const email=clean(data.email).toLowerCase(),name=clean(data.name);if(!name||!/^\S+@\S+\.\S+$/.test(email))failure(400,'Enter a name and valid email.');
    if(get('SELECT id FROM exam_staff WHERE lower(email)=? AND id!=?',email,id))failure(409,'Email already in use.');
    const exists=get('SELECT id FROM exam_staff WHERE id=?',id);if(!exists&&String(data.password||'').length<8)failure(400,'Initial password must contain at least 8 characters.');
    if(id===state.user.id&&(data.status==='Inactive'||role!=='admin'))failure(400,'You cannot deactivate or change the role of your own admin account.');
    if(exists)run('UPDATE exam_staff SET name=?,email=?,role=? WHERE id=?',name,email,role,id);else run('INSERT INTO exam_staff VALUES(?,?,?,?,?)',id,email,hash(data.password),role,name);
    if(exists&&data.password){if(data.password.length<8)failure(400,'Use at least 8 password characters.');run('UPDATE exam_staff SET password_hash=? WHERE id=?',hash(data.password),id);}
    saved.staffMeta[id]={phone:clean(data.phone),status:data.status==='Inactive'?'Inactive':'Active',speciality:clean(data.speciality)};
    queueEmail(saved,email,exists?'Staff account updated':'Staff welcome','Account role: '+role);
   }else if(kind==='publication'){
    const ids=data.ids||[data.itemId];if(!Array.isArray(ids)||!ids.length)failure(400,'Select examination results.');
    for(const itemId of ids){const row=resultRows().find(r=>r.id===itemId);if(!row||row.average===null)failure(400,'Both practical and theory marks are required before publication.');
      const status=data.moderated ? (saved.settings.autoPublish?'published':'draft') : data.published===false?'draft':'published';
      saved.moderation={...(saved.moderation||{}),[row.id]:{approved:!!data.moderated||status==='published',reviewedAt:new Date(clock()).toISOString()}};
      run('INSERT INTO learning_results VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score,status=excluded.status,feedback=excluded.feedback,updated=excluded.updated','admin-result-'+row.id,row.student_id,row.subject_id,row.grade,row.average,status,clean(data.feedback,3000),clock(),clock());
      if(status==='published')run("INSERT INTO exam_progress(student_id,subject_id,grade,passed,syllabus,result_status,updated) VALUES(?,?,?,?,0,?,?) ON CONFLICT(student_id,subject_id,grade) DO UPDATE SET passed=excluded.passed,result_status=excluded.result_status,updated=excluded.updated",row.student_id,row.subject_id,row.grade,row.average>=60?1:0,row.average>=60?'passed':'failed',clock());
      else run("UPDATE exam_progress SET passed=0,result_status='' WHERE student_id=? AND subject_id=? AND grade=?",row.student_id,row.subject_id,row.grade);
      queueEmail(saved,students().find(s=>s.student_id===row.student_id)?.email||row.student_id,status==='published'?'Result published':'Result withdrawn',row.subject+' / '+row.grade);
    }
   }else if(kind==='attendance'){
    if(!students().some(s=>s.student_id===data.studentId))failure(404,'Student not found.');const session=saved.ceremonies.find(s=>s.id===data.sessionId);if(!session)failure(400,'Select a ceremony session.');
    const attending=data.status==='Attending';const other=Object.entries(saved.attendance).filter(([key,a])=>key!==data.studentId&&a.sessionId===session.id&&a.status==='Attending');
    if(attending&&other.length>=session.capacity)failure(409,'This ceremony session is full.');
    const seat=clean(data.seat,30);if(attending&&seat&&other.some(([,a])=>a.seat===seat))failure(409,'Seat already assigned.');
    saved.attendance[data.studentId]={sessionId:session.id,status:['Attending','Not Attending','Pending'].includes(data.status)?data.status:'Pending',seat:attending?seat:'',award:clean(data.award)||'Participant',checkedIn:!!data.checkedIn};
   }else if(kind==='email-retry'){
    const row=saved.emails.find(r=>r.id===data.id);if(!row)failure(404,'Email log not found.');row.attempts++;row.status='Preview queued';row.lastAttempt=new Date(clock()).toISOString();
   }else if(kind==='profile'){
    if(!clean(data.name))failure(400,'Enter your name.');run('UPDATE exam_staff SET name=? WHERE id=?',clean(data.name),state.user.id);
   }else failure(404,'Unknown admin operation.');
   put('admin_portal_state',saved);audit(state.user.id,'admin-'+kind,data.applicationId||data.itemId||data.studentId||id);db.exec('COMMIT');if(kind==='staff'&&data.role==='teacher'){const item=teacherRecords.find(t=>t.id===id);if(item){item.name=clean(data.name);}else teacherRecords.push({id,name:clean(data.name),school:clean(data.speciality)||'ICFA',subjects:[]});}reply(200,snapshot());return true;
  }catch(e){db.exec('ROLLBACK');throw e;}
 };
}
