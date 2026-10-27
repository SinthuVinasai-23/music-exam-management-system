import {authSession,portalRequest} from '../auth/api.js';
import {useEffect,useRef,useState} from 'react';
import {useExaminer} from './ExaminerContext.jsx';
import {assignedSessions,validMark} from './examinerState.js';
import {admissionCandidates,demoCandidate,markAverage,markingKey} from './marking.js';
import {decodeFrame,startScanner} from '../supervisor/scanner.js';
function localApplications() {
  try {
    const saved=JSON.parse(localStorage.getItem('musicExamStudentPortal'));
    return (saved?.applications || []).filter(a=>a.admissionAvailable).flatMap(a=>a.entries.map(e=>({applicationId:a.id,indexNumber:a.studentId,name:a.candidateName,subject:e.subject,level:e.grade,medium:a.preferredMedium,location:a.preferredLocation,teacher:e.teacher})));
  } catch {return [];}
}
export default function ExaminerMarking({admissionLink} = {}) {
  const {state,dispatch}=useExaminer();
  const [canMark,setCanMark]=useState(false),[showLogin,setShowLogin]=useState(false),[staffEmail,setStaffEmail]=useState(''),[staffPassword,setStaffPassword]=useState('');
  useEffect(()=>{authSession().then(s=>setCanMark(s.user?.role==='examiner')).catch(()=>{});},[]);
  const [mode,setMode]=useState('practical'),[query,setQuery]=useState(''),[found,setFound]=useState([]),[selected,setSelected]=useState(''),[value,setValue]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[camera,setCamera]=useState(false),[pasted,setPasted]=useState('');
  const [remoteMarks,setRemoteMarks]=useState({});
  const video=useRef(null),controller=useRef(null);
  const records=[...(state.admissionCandidates||[]),...localApplications(),...assignedSessions(state).flatMap(s=>s.candidates.map(c=>({applicationId:s.id,indexNumber:c.registration,name:c.name,subject:s.subject,level:s.level})))];
  const record=found.find(r=>markingKey(r)===selected),marks={...(state.componentMarks?.[selected]||{}),...(remoteMarks[selected]||{})},average=markAverage(marks.practical,marks.theory);
  function choose(rows) {setFound(rows);setSelected(markingKey(rows[0]));setValue(remoteMarks[markingKey(rows[0])]?.[mode]??state.componentMarks?.[markingKey(rows[0])]?.[mode]??'');setError('');setMessage('');}
  async function scan(code) {try {
    let data = code;
    if (/^https?:/.test(code)) {
      let target = new URL(code);
      if(target.origin===location.origin && target.pathname==='/examiner/admission')target=new URL('/api/portal/applications/'+encodeURIComponent(target.searchParams.get('applicationId'))+'/marking-sheet?token='+encodeURIComponent(target.searchParams.get('token')),location.origin);
      if (target.origin !== location.origin || !/^\/api\/portal\/applications\/[^/]+\/marking-sheet$/.test(target.pathname)) throw Error('Unknown admission link.');
      target.searchParams.set('format','json');
      const response = await fetch(target);if(!response.ok)throw Error('Admission details unavailable.');data=await response.json();
    }
    const rows=admissionCandidates(data);dispatch({type:'IMPORT_ADMISSION',records:rows});choose(rows);setCamera(false);}catch(e){try{const row=demoCandidate(code);dispatch({type:'IMPORT_ADMISSION',records:[row]});choose([row]);setCamera(false);}catch(error){setFound([]);setSelected('');setError(error.message);setCamera(false);}}}
  useEffect(()=>{if(admissionLink)scan(admissionLink);},[admissionLink]);
  useEffect(()=>{
    if(!record || record.demo || !record.applicationId.startsWith('APP-'))return;
    let live=true;const load=()=>portalRequest('examiner-marks?applicationId='+encodeURIComponent(record.applicationId)).then(r=>{if(live)setRemoteMarks(old=>({...old,...r.marks}));}).catch(()=>{});
    load();const timer=setInterval(load,4000);return()=>{live=false;clearInterval(timer);};
  },[selected]);
  useEffect(()=>{
    if(!camera)return;
    const abort=new AbortController();controller.current=abort;
    startScanner(video.current,{signal:abort.signal,onCode:scan,onError:e=>{setError(e.message);setCamera(false);}}).catch(e=>{if(!abort.signal.aborted){setError('Camera could not start: '+e.message);setCamera(false);}});
    return ()=>abort.abort();
  },[camera]);
  function changeMode(next){controller.current?.abort();setCamera(false);setMode(next);setFound([]);setSelected('');setValue('');setError('');setMessage('');}
  async function upload(file) {
    if(!file)return;
    try {const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const code=decodeFrame(ctx.getImageData(0,0,canvas.width,canvas.height));if(!code)throw Error('No readable QR code found. Upload a clear image of the admission card QR code.');scan(code);}catch(e){setError(e.message);}
  }
  return <section className="examiner-marking" aria-label="Practical and theory marking">
    <h2>Student Examination Marks</h2>{!canMark&&<><p>Viewing only. Sign in as an examiner to enter marks.</p><button className="examiner-small-button" onClick={()=>setShowLogin(!showLogin)}>Examiner Sign In</button>{showLogin&&<form onSubmit={async e=>{e.preventDefault();try{const r=await portalRequest('staff-login',{email:staffEmail,password:staffPassword});if(r.user?.role!=='examiner')throw Error('Use an examiner account.');setCanMark(true);setShowLogin(false);setError('');}catch(e){setError(e.message)}}}><label>Examiner Email<input type="email" required value={staffEmail} onChange={e=>setStaffEmail(e.target.value)}/></label><label>Password<input type="password" required value={staffPassword} onChange={e=>setStaffPassword(e.target.value)}/></label><button>Sign In</button></form>}</>}<p>Record practical and theory marks out of 100. Final average = (Practical + Theory) ÷ 2.</p>
    <div className="examiner-inline"><button className="examiner-small-button" aria-pressed={mode==='practical'} onClick={()=>changeMode('practical')}>Practical — Scan QR</button><button className="examiner-small-button" aria-pressed={mode==='theory'} onClick={()=>changeMode('theory')}>Theory — Search Index Number</button></div>
    {mode==='practical'?<div className="examiner-marking-entry"><h3>Scan Admission QR Code</h3><button className="examiner-button" onClick={()=>{setError('');setCamera(!camera);}}>{camera?'Stop Camera':'Start Camera Scanner'}</button>{camera&&<video ref={video} muted playsInline aria-label="Admission QR scanner"/>}<label>Upload Admission QR Image<input type="file" accept="image/*" onChange={e=>{upload(e.target.files[0]);e.target.value='';}}/></label><details><summary>Enter QR data manually</summary><label>Admission QR Data<textarea value={pasted} onChange={e=>setPasted(e.target.value)}/></label><button className="examiner-small-button" onClick={()=>scan(pasted)}>Load Admission Details</button></details></div>:<form className="examiner-marking-entry" onSubmit={async e=>{e.preventDefault();let server=[];try{server=(await portalRequest('examiner-candidates?indexNumber='+encodeURIComponent(query.trim()))).records;}catch{}const unique=new Map([...records,...server].filter(r=>r.indexNumber.toLowerCase()===query.trim().toLowerCase()).map(r=>[markingKey(r),r]));if(!unique.size){const row=demoCandidate(query);dispatch({type:'IMPORT_ADMISSION',records:[row]});choose([row]);return;}choose([...unique.values()]);}}><label>Student Index Number<input required value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter exact student index number"/></label><button className="examiner-button">Search Student</button></form>}
    {error&&<p role="alert" className="examiner-marking-error">{error}</p>}{message&&<p role="status">{message}</p>}
    {record&&<form className="examiner-marking-record" onSubmit={async e=>{e.preventDefault();if(!canMark){setError('Sign in as an examiner to enter marks.');return;}if(!validMark(value)){setError('Enter a mark from 0 to 100, with up to two decimal places.');return;}try{if(!record.demo && record.applicationId.startsWith('APP-')){const r=await portalRequest('examiner-marks',{applicationId:record.applicationId,subject:record.subject,level:record.level,component:mode,mark:value});setRemoteMarks(old=>({...old,...r.marks}));}}catch(e){setError(e.message);return;}dispatch({type:'COMPONENT_MARK',key:selected,component:mode,value,name:record.name});setMessage(`${mode==='practical'?'Practical':'Theory'} marks saved.`);setError('');}}><h3>{record.name}</h3>{record.demo&&<p className="examiner-pill draft">Sample Student (Demo)</p>}<dl><div><dt>Index Number</dt><dd>{record.indexNumber}</dd></div><div><dt>Application</dt><dd>{record.applicationId}</dd></div><div><dt>Medium</dt><dd>{record.medium||'Not specified'}</dd></div><div><dt>Preferred Location</dt><dd>{record.location||'Not specified'}</dd></div></dl><label>Subject and Level<select aria-label="Subject and Level" value={selected} onChange={e=>{setSelected(e.target.value);setValue(state.componentMarks?.[e.target.value]?.[mode]??'');setMessage('');setError('');}}>{found.map(r=><option key={markingKey(r)} value={markingKey(r)}>{r.subject} — {r.level} ({r.applicationId})</option>)}</select></label><label>{mode==='practical'?'Practical':'Theory'} Marks (out of 100)<input type="number" min="0" max="100" step="0.01" required readOnly={!canMark} value={value} onChange={e=>setValue(e.target.value)}/></label><button disabled={!canMark} className="examiner-button">Save {mode==='practical'?'Practical':'Theory'} Marks</button><div className="examiner-mark-summary"><p>Practical: <strong>{marks.practical??'Not entered'}</strong></p><p>Theory: <strong>{marks.theory??'Not entered'}</strong></p><p>Average Marks: <strong>{average===null?'Pending both examinations':average.toFixed(2)+' / 100'}</strong></p></div></form>}
    <p className="examiner-marking-note">Demo mode: any non-empty index number or readable QR code can load a sample student when no matching admission exists. Use the same index number for both exams. Application marks are shared with the admission page. Sample student marks stay in this browser. The final average appears after both marks are saved.</p>
  </section>;
}

