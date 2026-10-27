import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { demoRequest, demoSession, parentChildren, selectParentChild } from '../src/auth/demoAccounts.js';
import { guardianAge } from '../src/student/rules.js';
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
beforeEach(()=>{globalThis.localStorage=storage();globalThis.sessionStorage=storage();});
const child=(patch={})=>({firstName:'Emma',lastName:'Smith',dateOfBirth:'2013-05-10',...patch});
const parent=(patch={})=>({firstName:'Jane',lastName:'Smith',phone:'0771234567',email:'parent@example.com',password:'Music1234',confirmPassword:'Music1234',...patch});
const registerParent=(c=child(),p=parent())=>demoRequest('register',{role:'parent',parent:p,child:c});
const verify=()=>demoRequest('verify',{code:'123456'});
test('full-date age blocks a student whose sixteenth birthday has not arrived',()=>{
 const now=new Date();const birthday=new Date(now.getFullYear()-16,now.getMonth(),now.getDate()+1);const dob=`${birthday.getFullYear()}-${String(birthday.getMonth()+1).padStart(2,'0')}-${String(birthday.getDate()).padStart(2,'0')}`;
 assert.equal(guardianAge(dob),15);
 assert.throws(()=>demoRequest('register',{...child({dateOfBirth:dob,email:'student@example.com',phone:'0771234567'}),role:'student',password:'Music1234',confirmPassword:'Music1234'}),/under 16/);
});
test('self registration requires confirmation and code before session/dashboard access',()=>{
 const values={...child({dateOfBirth:'2000-05-10',email:'student@example.com',phone:'0771234567'}),role:'student',password:'Music1234',confirmPassword:'Different123'};
 assert.throws(()=>demoRequest('register',values),/match/);values.confirmPassword=values.password;
 const result=demoRequest('register',values);assert.equal(result.user,null);assert.equal(result.pending.registrationStatus,'approved');assert.throws(()=>demoRequest('verify',{code:'111111'}),/Invalid/);
 const verified=verify();assert.equal(verified.user.role,'student');assert.match(verified.user.student_id,/^\d{4}\/0001$/);assert.equal(verified.user.verificationStatus,'approved');
 demoRequest('logout');const login=demoRequest('login',{role:'student',email:verified.user.student_id,password:'Music1234'});assert.equal(login.user.student_id,verified.user.student_id);
});
test('separate parent record, multiple children, normalized duplicates and persistent IDs',()=>{
 registerParent();assert.equal(demoSession().user,null);const verified=verify();assert.equal(verified.user.role,'parent');
 assert.equal(parentChildren(verified.user.id).length,1);assert.equal(parentChildren(verified.user.id)[0].email,'');
 const first=parentChildren(verified.user.id)[0];assert.equal(first.parentId,verified.user.id);assert.equal(first.parent,undefined);
 assert.throws(()=>demoRequest('add-candidate',child({firstName:'  EMMA  ',lastName:' smith '})),/already be registered/);
 demoRequest('add-candidate',child({dateOfBirth:'2014-05-10',email:'parent@example.com'}));
 demoRequest('add-candidate',child({firstName:'Oliver',email:'parent@example.com'}));
 assert.equal(parentChildren(verified.user.id).length,3);assert.equal(new Set(parentChildren(verified.user.id).map(s=>s.student_id)).size,3);
 assert.equal(JSON.parse(localStorage.getItem('musicDemoParents')).length,1);
 selectParentChild(first.student_id);assert.equal(demoSession().activeStudentId,first.student_id);
 demoRequest('logout');demoRequest('login',{role:'parent',email:'parent@example.com',password:'Music1234'});assert.equal(parentChildren(verified.user.id)[0].student_id,first.student_id);
});
test('unrelated parent cannot select another parent’s child and unauthenticated add fails',()=>{
 registerParent();verify();const id=parentChildren(demoSession().user.id)[0].student_id;demoRequest('logout');
 assert.throws(()=>demoRequest('add-candidate',child({firstName:'Other'})),/verified parent/);
 registerParent(child({firstName:'Other'}),parent({email:'other@example.com'}));verify();assert.throws(()=>selectParentChild(id),/not associated/);
});
test('resend preserves pending account; duplicate validation writes no extra parent record',()=>{
 registerParent();assert.ok(demoRequest('resend').pending);verify();
 assert.throws(()=>registerParent(child(),parent({email:'another@example.com'})),/already be registered/);
 assert.equal(JSON.parse(localStorage.getItem('musicDemoParents')).length,1);
});
test('minimum examination age remains year-based for parent-managed children',()=>{
 const year=new Date().getFullYear();assert.throws(()=>registerParent(child({dateOfBirth:`${year-5}-01-01`})),/at least 6/);
 registerParent(child({dateOfBirth:`${year-6}-12-31`}));verify();assert.equal(parentChildren(demoSession().user.id).length,1);
});

test('student ID is unchanged when logging in in a future calendar year',()=>{
 const pending=demoRequest('register',{...child({dateOfBirth:'2000-05-10',email:'student@example.com',phone:'0771234567'}),role:'student',password:'Music1234',confirmPassword:'Music1234'});
 const id=verify().user.student_id;demoRequest('logout');
 const OriginalDate=globalThis.Date;
 globalThis.Date=class extends OriginalDate { constructor(...args){super(...(args.length?args:['2030-01-01T00:00:00Z']));} };
 try {assert.equal(demoRequest('login',{role:'student',email:id,password:'Music1234'}).user.student_id,id);} finally {globalThis.Date=OriginalDate;}
});
