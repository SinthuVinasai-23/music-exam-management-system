import {validMark} from './examinerState.js';
export const markAverage = (practical, theory) => validMark(practical) && validMark(theory) ? Math.round((Number(practical) + Number(theory)) * 50) / 100 : null;
export const markingKey = r => JSON.stringify([r.applicationId, r.indexNumber, r.subject, r.level]);
export function admissionCandidates(data) {
  if (typeof data === 'string') { try {data = JSON.parse(data);} catch {throw Error('This QR code is not an ICFA admission card.');} }
  if (data?.document !== 'ICFA Admission Card' || data.status !== 'approved' || typeof data.studentName !== 'string' || !data.studentName.trim() || typeof data.studentId !== 'string' || !data.studentId || typeof data.applicationId !== 'string' || !data.applicationId || !Array.isArray(data.examinations) || !data.examinations.length) throw Error('Scan an approved ICFA admission card containing student and examination details.');
  return data.examinations.map(e => {
    if (!e.subject || !e.level || e.approval !== 'approved') throw Error('The admission card contains an unapproved or incomplete examination.');
    return {applicationId:data.applicationId,indexNumber:data.studentId,name:data.studentName,subject:e.subject,level:e.level,medium:data.medium,location:data.preferredLocation,teacher:e.teacher};
  });
}

export function demoCandidate(input) {
  let index = String(input || '').trim();
  if (!index) throw Error('Enter an index number or scan a QR code.');
  try {const data=JSON.parse(index);index=String(data.studentId || data.indexNumber || data.id || index);} catch {}
  index=index.slice(0,200);
  let hash=0;for(const c of index.toLowerCase()) hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
  const names=['Ananya Nair','Kavya Natarajan','Sanjay Krishnan','Meera Raman','Arjun Kumar','Nithya Rao'];
  const subjects=['Miruthangam','Bharatanatyam','Carnatic Vocal'];
  return {applicationId:`DEMO-${hash.toString(16).toUpperCase()}`,indexNumber:index,name:names[hash%names.length],subject:subjects[hash%subjects.length],level:`Grade ${hash%3+1}`,medium:'English',location:['Colombo','Jaffna','Kandy'][hash%3],demo:true};
}
