export const usersByRole = {
  Teachers: [
    { id: 't1', name: 'Sanjay Krishnan', email: 'e.rostropovich@conservatory.edu', role: 'Senior Flute Pedagogue', status: 'ACTIVE' },
    { id: 't2', name: 'Shruti Iyer', email: 'j.thorne@academy.music', role: 'Head of Strings', status: 'ACTIVE' },
    { id: 't3', name: 'Siddharth Rajan', email: 's.montgomery@admin.org', role: 'Junior Accompanist', status: 'INACTIVE' },
    { id: 't4', name: 'Ashwin Pillai', email: 'm.vance@board.com', role: 'Chief Examiner', status: 'ACTIVE' },
    { id: 't5', name: 'Lakshmi Narayanan', email: 'lakshmi.narayanan@academy.music', role: 'Senior Vocal Instructor', status: 'ACTIVE' },
    { id: 't6', name: 'Rohan Mathew', email: 'rohan.mathew@conservatory.edu', role: 'Piano Faculty', status: 'ACTIVE' },
    { id: 't7', name: 'Nisha Varma', email: 'nisha.varma@academy.music', role: 'Violin Faculty', status: 'ACTIVE' },
    { id: 't8', name: 'Girish Nair', email: 'girish.nair@board.org', role: 'Percussion Faculty', status: 'INACTIVE' },
    { id: 't9', name: 'Deepa Krishnan', email: 'deepa.krishnan@academy.music', role: 'Music Theory Faculty', status: 'ACTIVE' },
    { id: 't10', name: 'Harish Babu', email: 'harish.babu@conservatory.edu', role: 'Mridangam Faculty', status: 'ACTIVE' },
    { id: 't11', name: 'Maya Iyer', email: 'maya.iyer@academy.music', role: 'Flute Faculty', status: 'ACTIVE' },
    { id: 't12', name: 'Naveen Rao', email: 'naveen.rao@board.org', role: 'Accompaniment Faculty', status: 'ACTIVE' }
  ],
  Examiners: [
    { id: 'e1', name: 'Dr. Meenakshi Iyer', email: 'meenakshi.iyer@board.org', role: 'Evaluator / Examiner', status: 'ACTIVE' },
    { id: 'e2', name: 'Ashwin Pillai', email: 'm.vance@board.com', role: 'Chief Examiner', status: 'ACTIVE' },
    { id: 'e3', name: 'Anjali Menon', email: 'anjali.menon@academy.music', role: 'Evaluator / Examiner', status: 'ACTIVE' },
    { id: 'e4', name: 'Vikram Rao', email: 'vikram.rao@board.org', role: 'Theory Examiner', status: 'INACTIVE' },
    { id: 'e5', name: 'Dr. Kavitha Rao', email: 'kavitha.rao@board.org', role: 'Practical Examiner', status: 'ACTIVE' },
    { id: 'e6', name: 'Suresh Menon', email: 'suresh.menon@board.org', role: 'Evaluator / Examiner', status: 'ACTIVE' },
    { id: 'e7', name: 'Asha Nandakumar', email: 'asha.nandakumar@board.org', role: 'Vocal Examiner', status: 'ACTIVE' },
    { id: 'e8', name: 'Pradeep Iyer', email: 'pradeep.iyer@board.org', role: 'Instrumental Examiner', status: 'ACTIVE' },
    { id: 'e9', name: 'Divya Nair', email: 'divya.nair@board.org', role: 'Theory Examiner', status: 'ACTIVE' },
    { id: 'e10', name: 'Mohan Krishnan', email: 'mohan.krishnan@board.org', role: 'Evaluator / Examiner', status: 'ACTIVE' },
    { id: 'e11', name: 'Geetha Pillai', email: 'geetha.pillai@board.org', role: 'Practical Examiner', status: 'INACTIVE' },
    { id: 'e12', name: 'Rahul Menon', email: 'rahul.menon@board.org', role: 'Evaluator / Examiner', status: 'ACTIVE' }
  ],
  Invigilators: [
    { id: 'i1', name: 'Dr. Karthik Natarajan', email: 'karthik.natarajan@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s1', 's2', 's3'] },
    { id: 'i2', name: 'Priya Menon', email: 'priya.menon@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s1', 's2'] },
    { id: 'i3', name: 'Arun Kumar', email: 'arun.kumar@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s4'] },
    { id: 'i4', name: 'Leena Das', email: 'leena.das@board.org', role: 'Invigilator / Exam Supervisor', status: 'INACTIVE', assignedSessionIds: [] },

    { id: 'i5', name: 'Ramesh Iyer', email: 'ramesh.iyer@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s2', 's4'] },
    { id: 'i6', name: 'Anitha Rao', email: 'anitha.rao@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s1'] },
    { id: 'i7', name: 'Sandeep Menon', email: 'sandeep.menon@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s3'] },
    { id: 'i8', name: 'Meera Nair', email: 'meera.nair@board.org', role: 'Invigilator / Exam Supervisor', status: 'INACTIVE', assignedSessionIds: [] },

    { id: 'i9', name: 'Vijay Krishnan', email: 'vijay.krishnan@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s1', 's4'] },
    { id: 'i10', name: 'Shalini Kumar', email: 'shalini.kumar@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s2'] },
    { id: 'i11', name: 'Naveen Pillai', email: 'naveen.pillai@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: ['s3', 's4'] },
    { id: 'i12', name: 'Deepa Varma', email: 'deepa.varma@board.org', role: 'Invigilator / Exam Supervisor', status: 'ACTIVE', assignedSessionIds: [] }
  ]
}

export const examSessions = [
  {
    id: 's1',
    venue: 'Mozart Hall',
    label: 'Morning Session',
    time: '09:00 AM',
    date: '15 Dec 2024',
    examination: 'Mridangam – Grade 8',
    candidates: 24
  },
  {
    id: 's2',
    venue: 'Beethoven Studio',
    label: 'Afternoon Block',
    time: '01:00 PM',
    date: '15 Dec 2024',
    examination: 'Theory – Grade 5',
    candidates: 45
  },
  {
    id: 's3',
    venue: 'Chopin Room',
    label: 'Evening Performance',
    time: '05:30 PM',
    date: '15 Dec 2024',
    examination: 'Woodwind Ensemble',
    candidates: 12
  },
  {
    id: 's4',
    venue: 'Liszt Recital Hall',
    label: 'Full Day Supervision',
    time: '09:00 AM – 05:00 PM',
    date: '16 Dec 2024',
    examination: 'Mixed Practical Sessions',
    candidates: 38
  }
]
