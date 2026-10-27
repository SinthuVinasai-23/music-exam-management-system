import { subjects } from './studentData.js';
import { gradeOrder } from '../rules.js';
const content = {
 English: { question: 'What does rhythm describe in music?', options: ['The pattern of timing and beats', 'The color of the instrument'], explanation: 'Rhythm organizes timing and beats.' },
 Tamil: { question: 'இசையில் தாளம் எதைக் குறிக்கிறது?', options: ['நேரம் மற்றும் துடிப்பின் அமைப்பு', 'கருவியின் நிறம்'], explanation: 'தாளம் இசையின் நேரம் மற்றும் துடிப்புகளை ஒழுங்குபடுத்துகிறது.' },
};
export const practiceQuestions = subjects.flatMap(subject => gradeOrder.map(grade => ({ id: `${subject.id}-${grade}`, subjectId: subject.id, grade, content, answer: 0 })));
export function questionsFor(subjectId, grades, medium) {
 return practiceQuestions.filter(q => q.subjectId === subjectId && grades.includes(q.grade)).map(q => ({ ...q, ...q.content[medium] }));
}
