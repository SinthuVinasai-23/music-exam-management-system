import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {ArrowLeft, Bell, CheckCircle2, History} from 'lucide-react';

export function RecentTasks({open, close, events}) {
  const ref=useRef(null), location=useLocation();
  useEffect(()=>{close();},[location.pathname]);
  useEffect(()=>{
    if(!open) return;
    const outside=e=>{if(!ref.current?.contains(e.target) && !e.target.closest('[aria-label="Activity history and sync"]')) close();};
    const key=e=>{if(e.key==='Escape') close();};
    document.addEventListener('pointerdown',outside); document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[open,close]);
  if(!open) return null;
  return <section ref={ref} className="sv-recent" aria-label="Recent Activity"><header><b>Recent Activity</b><small>{Math.min(events.length,5)} Actions</small></header>{events.slice(0,5).map(e=><article key={e.id}><History size={18}/><div>{e.message}<small>{new Date(e.at).toLocaleString()}</small></div></article>)}{!events.length&&<p>No activity yet. Your verification and attendance actions will appear here.</p>}</section>;
}
export function Notifications({state,commit,fail}) {
  const [limit,setLimit]=useState(5);
  const notes=[...state.events,{id:'assigned-sessions',message:'Examination sessions assigned',detail:'Your assigned venues and candidate rosters are ready to review.',at:'2026-09-19T00:00:00Z',href:'/supervisor/attendance'}];
  const read=state.readNotifications||[];
  const mark=ids=>{try{commit(s=>({...s,readNotifications:[...new Set([...(s.readNotifications||[]),...ids])]}));}catch(e){fail(e);}};
  return <section className="sv-notifications"><Link className="sv-back" to="/supervisor"><ArrowLeft/>Back</Link><div className="sv-section-heading"><h1>Notifications</h1><button onClick={()=>mark(notes.map(n=>n.id))}>Mark all as read</button></div><div className="sv-notification-list">{notes.slice(0,limit).map(n=><article key={n.id} className={read.includes(n.id)?'read':'unread'}><Bell/><div><button onClick={()=>mark([n.id])}>{n.message}</button>{n.detail&&<p>{n.detail}</p>}{n.href&&<Link to={n.href} onClick={()=>mark([n.id])}>View assigned sessions →</Link>}</div><time>{new Date(n.at).toLocaleString()}</time></article>)}</div>{limit<notes.length&&<button className="sv-load-more" onClick={()=>setLimit(n=>n+5)}>Load More Notifications</button>}</section>;
}
export function Security({state,commit,notify,setDialog}) {
  const [fields,setFields]=useState({current:'',next:'',confirm:''}), [twoFactor,setTwoFactor]=useState(state.security?.twoFactor||false),[error,setError]=useState('');
  const save=e=>{
    e.preventDefault();setError('');
    if(Object.values(fields).some(Boolean)) {
      if(!fields.current||!fields.next||!fields.confirm) return setError('Complete all three password fields.');
      if(fields.next.length<12) return setError('Use at least 12 characters for the new password.');
      if(fields.next!==fields.confirm) return setError('New passwords do not match.');
      if(fields.current===fields.next) return setError('Choose a different new password.');
    }
    try {commit(s=>({...s,security:{twoFactor,updatedAt:new Date().toISOString()},events:[{id:crypto.randomUUID(),message:'Updated profile security preferences',at:new Date().toISOString()},...s.events]}));setFields({current:'',next:'',confirm:''});notify('Your account settings have been updated and are now active.','Changes Saved Successfully');} catch {setError('Unable to save settings. Please try again.');}
  };
  return <form className="sv-security-form" onSubmit={save} noValidate><section><h2>Change Password</h2><div className="sv-password-fields">{[['current','CURRENT PASSWORD'],['next','NEW PASSWORD'],['confirm','CONFIRM NEW PASSWORD']].map(([k,label])=><label key={k}>{label}<input type="password" autoComplete={k==='current'?'current-password':'new-password'} value={fields[k]} onChange={e=>setFields({...fields,[k]:e.target.value})}/></label>)}</div><p className="sv-demo-note">Demo security settings: password validation is available; live password changes and two-factor authentication require a staff identity service. Passwords are never saved here.</p></section><section className="sv-two-factor"><div><b>Two-Factor Authentication (2FA)</b><p>Require a verification code in addition to your password.</p></div><button type="button" role="switch" aria-label="Two-Factor Authentication" aria-checked={twoFactor} className={twoFactor?'enabled':''} onClick={()=>setTwoFactor(!twoFactor)}><span/></button></section><section><b>Login History</b><div className="sv-login-session"><span>This browser · Current demo session<br/>Last active: Just now</span><button type="button" onClick={()=>setDialog({type:'logout'})}>LOGOUT</button></div></section>{error&&<p role="alert" className="sv-inline-error">{error}</p>}<footer><button type="button" className="sv-outline" onClick={()=>{setFields({current:'',next:'',confirm:''});setTwoFactor(state.security?.twoFactor||false);setError('');}}>Cancel</button><button className="sv-gold">Save Changes</button></footer></form>;
}
