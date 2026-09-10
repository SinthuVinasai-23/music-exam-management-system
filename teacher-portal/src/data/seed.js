const names = [
  'Ananya Nair',
  'Ashwin Pillai',
  'Bala Subramaniam',
  'Kavya Natarajan',
  'Sanjay Krishnan',
  'Shruti Iyer',
  'Siddharth Rajan',
  'Meera Raman',
  'Arjun Menon',
  'Priya Shankar',
  'Devika Rao',
  'Nithya Kumar',
];
export const disciplines = [
  'Mridangam - Level 8',
  'Bharatanatyam - Level 5',
  'Carnatic Vocal - Level 7',
  'Veena - Level 6',
  'Piano - Grade 5',
];
export const venues = [
  'Mozart Recital Hall',
  'Beethoven Studio B',
  'Main Conservatory Annex',
];
export const initialState = {
  profile: {
    firstName: 'Dr. Ramesh',
    lastName: 'Iyer',
    email: 'iyer@aria-academy.edu',
    phone: '+94 77 123 4567',
    specialization: 'Carnatic Music',
    photo: '',
  },
  security: { twoFactor: false, passwordUpdatedAt: null },
  applications: names.map((name, i) => ({
    id: i === 0 ? '772-ART-24' : `773-ART-${24 + i}`,
    candidateId: `c${i}`,
    name,
    email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
    age: 14 + (i % 8),
    discipline:
      i === 0 ? 'Mridangam - Level 3 and Grade 2' : disciplines[i % 5],
    submittedAt: `2026-09-01T${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}:00`,
    status: 'awaiting-review',
    documents: [{ name: 'Level 4 Certificate', type: 'JPG', size: '2.4 MB' }],
    exams:
      i === 0
        ? [
            'Mridangam - Level 3 and Grade 2',
            'Veena - Level 2',
            'Vocal - Grade 3',
          ]
        : [disciplines[i % 5]],
  })),
  students: Array.from({ length: 12 }, (_, i) => ({
    id: `RA-2026-${8821 + i * 13}`,
    candidateId: `s${i === 3 ? 2 : i}`,
    name: [
      'Bala Subramaniam',
      'Kavya Natarajan',
      'Shruti Iyer',
      'Shruti Iyer',
      ...names,
    ][i],
    email: `student${i + 1}@conservatoire.edu`,
    discipline: disciplines[i % 5],
    level: [8, 5, 7, 6, 5][i % 5],
    track: [
      'Performance diploma',
      'Standard certification',
      'Vocal performance',
      'Classical ensemble',
    ][i % 4],
    status: i % 3 === 1 ? 'Pending' : 'Slot Assigned',
    sessionId:
      i % 3 === 1
        ? null
        : ['session-0', 'available-1', 'session-1', 'session-2', 'available-4'][
            i % 5
          ],
  })),
  sessions: [
    {
      id: 'session-0',
      date: '2026-12-11',
      start: '09:00',
      end: '10:30',
      venue: venues[0],
      type: disciplines[0],
      capacity: 12,
    },
    {
      id: 'session-1',
      date: '2026-12-11',
      start: '11:30',
      end: '13:00',
      venue: venues[1],
      type: disciplines[2],
      capacity: 12,
    },
    {
      id: 'session-2',
      date: '2026-12-12',
      start: '14:00',
      end: '15:30',
      venue: venues[2],
      type: disciplines[3],
      capacity: 12,
    },
    ...disciplines.map((type, i) => ({
      id: `available-${i}`,
      date: `2026-12-${14 + i}`,
      start: '09:00',
      end: '10:30',
      venue: venues[i % 3],
      type,
      capacity: 12,
    })),
  ],
  notifications: [
    {
      id: 'n1',
      title: 'Exam Slot Reminder',
      message:
        'Your upcoming practical examinations are ready to view in the examination schedule.',
      time: '10m ago',
      read: false,
      icon: 'GraduationCap',
    },
    {
      id: 'n2',
      title: 'New Application',
      message:
        'Ananya Nair has submitted an application. Review the first candidate in your application line.',
      time: '2 hours ago',
      read: false,
      icon: 'UserPlus',
    },
    {
      id: 'n3',
      title: 'System Maintenance Scheduled',
      message:
        'The portal will be offline for scheduled updates from 02:00 AM to 04:00 AM on Sunday.',
      time: 'Yesterday',
      read: true,
      icon: 'Settings',
    },
    {
      id: 'n4',
      title: 'Grade Report Published',
      message: 'Final grades for the Autumn Vocal Cohort have been published.',
      time: 'Oct 24',
      read: true,
      icon: 'FileText',
    },
    {
      id: 'n5',
      title: 'Winter Term Registration',
      message: 'Winter examination registration is now open.',
      time: 'Oct 23',
      read: true,
      icon: 'Calendar',
    },
    {
      id: 'n6',
      title: 'Profile Reminder',
      message:
        'Please check your contact information before the next examination term.',
      time: 'Oct 22',
      read: true,
      icon: 'User',
    },
  ],
  activity: [
    {
      id: 'a1',
      text: 'Approved Sebastian Vance’s Application',
      time: '10m ago',
    },
    { id: 'a2', text: 'Scheduled Piano Grade 5 Session', time: '45m ago' },
    { id: 'a3', text: 'Sent Query for Clara Schumann', time: '2h ago' },
    { id: 'a4', text: 'Updated Profile Security', time: 'Yesterday' },
    {
      id: 'a5',
      text: 'Approved Julian Bream’s Application',
      time: 'Yesterday',
    },
  ],
  emailEvents: [],
};
