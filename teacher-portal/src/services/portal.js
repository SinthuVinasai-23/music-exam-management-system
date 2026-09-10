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
  if (['approve', 'reject', 'query'].includes(action.type)) {
    const head = queue(next)[0];
    if (!head || head.id !== action.id)
      throw new Error(
        'Only the first application in the FIFO queue can be reviewed.',
      );
    if (head.status === 'awaiting-correction')
      throw new Error(
        'This application is paused until the applicant responds.',
      );
    if (action.type === 'approve' && !action.signature?.value?.trim())
      throw new Error('Please draw or type your signature before confirming.');
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
    if (action.type === 'approve') {
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
