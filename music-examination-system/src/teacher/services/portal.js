export const STORAGE_KEY = 'music-teacher-portal-v1';
export const queue = (state) =>
  state.applications
    .filter((a) => !['approved', 'rejected'].includes(a.status))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
const minutes = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
export const overlap = (a, b, buffer = 0) =>
  a.date === b.date &&
  minutes(a.start) < minutes(b.end) + buffer &&
  minutes(b.start) < minutes(a.end) + buffer;
export function validateSession(state, session) {
  if (
    !session.date ||
    !session.start ||
    !session.end ||
    !session.venue ||
    !session.type
  )
    throw new Error('Complete all examination session fields.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date) || Number.isNaN(Date.parse(session.date)) || new Date(session.date).toISOString().slice(0,10) !== session.date)
    throw new Error('Choose a valid examination date.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(session.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.end))
    throw new Error('Choose valid start and end times.');
  if (session.date < new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)) throw new Error('Choose today or a future examination date.');
  if (
    !Number.isInteger(Number(session.capacity)) ||
    Number(session.capacity) < 1 ||
    Number(session.capacity) > 100
  )
    throw new Error('Max candidates must be a whole number between 1 and 100.');
  if (minutes(session.end) <= minutes(session.start))
    throw new Error('The session must end after it starts.');
  if (
    state.sessions.some((s) => s.venue === session.venue && overlap(s, session))
  )
    throw new Error(
      'This venue already has an overlapping examination session.',
    );
}
export function validateAssignment(state, studentId, sessionId) {
  const student = state.students.find((s) => s.id === studentId);
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!student || !session)
    throw new Error('Select an available examination session.');
  if (student.discipline !== session.type)
    throw new Error(
      'Select a session matching this candidate’s discipline and level.',
    );
  if (student.sessionId === sessionId)
    throw new Error('This examination slot is already assigned.');
  if (
    state.students.filter((s) => s.sessionId === sessionId).length >=
    session.capacity
  )
    throw new Error('This session is full. Please choose another session.');
  const others = state.students
    .filter(
      (s) =>
        s.id !== student.id &&
        s.candidateId === student.candidateId &&
        s.sessionId,
    )
    .map((s) => state.sessions.find((x) => x.id === s.sessionId))
    .filter(Boolean);
  if (others.some((s) => overlap(s, session, 30)))
    throw new Error(
      'This candidate has another exam within the required 30-minute buffer.',
    );
}
export function transact(state, action) {
  const next = structuredClone(state);
  const stamp = new Date().toISOString();
  const id = crypto.randomUUID();
  const log = (text) =>
    next.activity.unshift({ id, text, time: 'Just now', createdAt: stamp });
  const notify = (title, message, recipient) => {
    next.notifications.unshift({
      id,
      title,
      message,
      time: 'Just now',
      read: false,
      icon: 'FileText',
    });
    if (recipient)
      next.emailEvents.push({
        id,
        recipient,
        type: title,
        message,
        status: 'simulated',
        createdAt: stamp,
      });
  };
  if(action.type==='student-application') {
    const student=next.students.find(s=>s.id===action.studentId);
    if(!student)throw new Error('Student not found.');
    const appId='APP-'+student.id;
    if(!next.applications.some(a=>a.id===appId))next.applications.push({id:appId,candidateId:student.candidateId,name:student.name,email:student.email,discipline:student.discipline,exams:[student.discipline],age:student.age||17,submittedAt:stamp,status:'approved',documents:[],track:student.track});
    return next;
  }
  if (['approve', 'reject', 'query', 'payment'].includes(action.type)) {
    const head = next.applications.find(a=>a.id===action.id);
    if(!head || ['approved','rejected'].includes(head.status)) throw new Error('Select an application awaiting review.');
    if (head.status === 'awaiting-correction')
      throw new Error(
        'This application is paused until the applicant responds.',
      );
    if (action.type === 'approve' && !action.signature?.value?.trim())
      throw new Error('Please draw or type your signature before confirming.');
    if (action.type === 'approve' && action.paymentStatus !== 'collected')
      throw new Error('Confirm Payment Collected before approving the application.');
    if (action.type === 'payment' && action.paymentStatus !== 'not-collected')
      throw new Error('Select Payment Not Collected to record a pending payment.');
    if (action.type === 'payment' && !action.paymentReason?.trim())
      throw new Error('Please provide a reason for payment not collected.');
    if (['approve', 'payment'].includes(action.type)) {
      const verification = {
        status: action.paymentStatus,
        reason: action.paymentStatus === 'not-collected' ? action.paymentReason.trim() : '',
        teacherId: next.profile.id || next.profile.email,
        teacherName: `${next.profile.firstName} ${next.profile.lastName}`.trim(),
        confirmedAt: stamp,
      };
      head.paymentVerification = verification;
      head.paymentHistory = [...(head.paymentHistory || []), verification];
    }
    if (action.type === 'reject' && (action.reason || '').trim().length < 10)
      throw new Error(
        'Please provide a rejection reason of at least 10 characters.',
      );
    if (action.type === 'query' && (action.details || '').trim().length < 10)
      throw new Error(
        'Please describe the required correction in at least 10 characters.',
      );
    head.updatedAt = stamp;
    head.reference = `${action.type === 'reject' ? 'REJ' : 'APP'}-${id.slice(0, 8).toUpperCase()}-CERT`;
    if (action.type === 'payment') {
      // Recording unpaid fees cannot approve the candidate or advance the queue.
      if (action.signature?.value?.trim()) head.signature = action.signature;
      head.status = 'awaiting-review';
      log(`Recorded payment not collected for ${head.name}`);
      notify('Payment Pending', `${head.name}: ${head.paymentVerification.reason}`, head.email);
    } else if (action.type === 'approve') {
      head.status = 'approved';
      head.signature = action.signature;
      head.exams.forEach((discipline, i) =>
        next.students.push({
          id: `${head.id}-${i}`,
          candidateId: head.candidateId,
          name: head.name,
          email: head.email,
          discipline,
          level: Number(discipline.match(/\d+/)?.[0] || 1),
          track: 'Standard certification',
          status: 'Pending',
          sessionId: null,
        }),
      );
      log(`Approved ${head.name}’s Application`);
      notify(
        'Application Approved',
        `${head.name}’s application was approved. Slot assignment is pending.`,
        head.email,
      );
    } else if (action.type === 'reject') {
      head.status = 'rejected';
      head.reason = action.reason.trim();
      head.refund = 'initiated-demo';
      log(`Rejected ${head.name}’s Application`);
      notify(
        'Application Rejected',
        `${head.name}’s application was rejected. Reason: ${head.reason}`,
        head.email,
      );
    } else {
      head.status = 'awaiting-correction';
      head.query = {
        category: action.category,
        details: action.details.trim(),
        urgency: action.urgency,
        createdAt: stamp,
      };
      log(`Sent Query for ${head.name}`);
      notify(
        'Correction Requested',
        `${head.name}: ${head.query.details}`,
        head.email,
      );
    }
  } else if (action.type === 'session') {
    validateSession(next, action.session);
    next.sessions.push({
      ...action.session,
      id,
      capacity: Number(action.session.capacity),
    });
    log(`Scheduled ${action.session.type} Session`);
  } else if (action.type === 'assign') {
    validateAssignment(next, action.studentId, action.sessionId);
    const student = next.students.find((s) => s.id === action.studentId);
    student.sessionId = action.sessionId;
    student.status = 'Slot Assigned';
    log(`Assigned Examination Slot for ${student.name}`);
    notify(
      'Examination Slot Assigned',
      `${student.name}’s examination slot is now assigned.`,
      student.email,
    );
  } else if (action.type === 'profile') {
    next.profile = action.profile;
    log('Updated Profile Information');
  } else if (action.type === 'security') {
    next.security = { ...next.security, ...action.security };
    log('Updated Profile Security');
  } else if (action.type === 'read')
    next.notifications.forEach((n) => {
      n.read = true;
    });
  else throw new Error('Unknown portal action.');
  return next;
}

// Roster membership means the application has already been approved.
export function studentApprovalRows(state) {
  const rows = state.students.map(s => ({...s, approvalStatus: 'Approved', paymentVerification: s.paymentVerification || state.applications.find(a => a.status === 'approved' && s.id.startsWith(`${a.id}-`))?.paymentVerification}));
  for (const a of state.applications.filter(a => a.status !== 'approved')) {
    a.exams.forEach((discipline, i) => rows.push({
      id: `${a.id}-${i}`, candidateId: a.candidateId, name: a.name, email: a.email,
      discipline, level: Number(discipline.match(/\d+/)?.[0] || 1), track: 'Standard certification',
      approvalStatus: a.status === 'rejected' ? 'Rejected' : 'Not Approved',
      paymentVerification: a.paymentVerification,
    }));
  }
  return rows;
}
