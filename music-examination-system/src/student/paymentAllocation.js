import { subjectFee } from './utils.js';
export function teacherBalances(app) {
  const groups = new Map();
  for (const subject of app?.subjects || []) {
    const choice = app.subjectSelections?.[subject] || { teacher: app.teacher, grade: app.grade };
    const teacher = choice.teacher || 'Teacher not assigned';
    const group = groups.get(teacher) || { teacher, subjects: [], cents: 0 };
    group.subjects.push(subject);group.cents += Math.round(subjectFee(choice.grade) * 100);groups.set(teacher,group);
  }
  return [...groups.values()];
}
export function paymentSplit(groups, choices) {
  return groups.map(group => {
    const choice = choices[group.teacher] || {};
    const amount = choice.handover ? String(choice.amount ?? '') : '0';
    const valid = /^\d+(\.\d{1,2})?$/.test(amount);
    const handed = valid ? Math.round(Number(amount) * 100) : 0;
    const error = !valid || handed < 0 || handed > group.cents ? `Enter a handover amount from 0 to ${(group.cents/100).toFixed(2)} for ${group.teacher}.` : '';
    return { ...group, handed, remaining: group.cents - handed, method: choice.method || 'card', error };
  });
}
