export const applicantProfile = {
  name: 'Bala Subramaniam',
  displayName: 'BALA',
  institution: 'Julianne Conservatory of Music',
  candidateId: 'ARB-2024-0089',
};

export const teachers = [
  'Dr. Karthik Iyer',
  'Meera Ramanathan',
  'Anjali Narayanan',
  'Suresh Krishnan',
  'Priya Venkatesh',
  'Ravi Shankar',
  'Lakshmi Mahadevan',
];

export const gradeOrder = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Diploma'];

export const feeTable = {
  'Grade 1': 110,
  'Grade 2': 150,
  'Grade 3': 190,
  'Grade 4': 235,
  'Grade 5': 285,
  Diploma: 425,
};

export const subjects = [
  { id: 'violin', name: 'Violin', type: 'String Performance' },
  { id: 'veena', name: 'Veena', type: 'Classical String' },
  { id: 'mridangam', name: 'Mridangam', type: 'Percussion Performance' },
  { id: 'flute', name: 'Flute', type: 'Wind Performance' },
  { id: 'bharatanatyam', name: 'Bharatanatyam', type: 'Dance Performance' },
  { id: 'carnatic-vocal', name: 'Carnatic Vocal', type: 'Voice Performance' },
  { id: 'theory', name: 'Carnatic Music Theory', type: 'Theory Assessment' },
];

export const seededApplications = [
  {
    id: 'APP-8429-24',
    title: 'Carnatic Vocal Performance - L2',
    candidateName: 'Bala Subramaniam',
    grade: 'Grade 2',
    teacher: 'Meera Ramanathan',
    subjects: ['Carnatic Vocal'],
    session: 'Winter Session 2024',
    applicationStatus: 'In Review',
    paymentStatus: 'Required',
    admissionAvailable: true,
    payment: null,
  },
  {
    id: 'APP-1102-24',
    title: 'Carnatic Music Theory - Advanced',
    candidateName: 'Bala Subramaniam',
    grade: 'Grade 5',
    teacher: 'Dr. Karthik Iyer',
    subjects: ['Carnatic Music Theory'],
    session: 'Winter Session 2024',
    applicationStatus: 'Approved',
    paymentStatus: 'Paid',
    admissionAvailable: true,
    payment: {
      invoiceId: 'GMEB-2024-8842',
      paymentId: 'PAY-2024-4421',
      date: 'Oct 24, 2024',
      amount: 285,
      currency: 'CAD',
      last4: '4421',
      status: 'Paid',
    },
  },
  {
    id: 'APP-9931-24',
    title: 'Veena - Diploma',
    candidateName: 'Bala Subramaniam',
    grade: 'Diploma',
    teacher: 'Lakshmi Mahadevan',
    subjects: ['Veena'],
    session: 'Autumn Session 2024',
    applicationStatus: 'Pending',
    paymentStatus: 'Required',
    admissionAvailable: false,
    payment: null,
  },
  {
    id: 'APP-7721-24',
    title: 'Bharatanatyam - Grade 5',
    candidateName: 'Bala Subramaniam',
    grade: 'Grade 5',
    teacher: 'Anjali Narayanan',
    subjects: ['Bharatanatyam'],
    session: 'Spring Session 2024',
    applicationStatus: 'In Review',
    paymentStatus: 'Paid',
    admissionAvailable: true,
    payment: {
      invoiceId: 'GMEB-2024-5521',
      paymentId: 'PAY-2024-5521',
      date: 'Nov 12, 2024',
      amount: 285,
      currency: 'CAD',
      last4: '5521',
      status: 'Paid',
    },
  },
];

export const admissions = [
  {
    applicationId: 'APP-8429-24',
    subject: 'Mridangam',
    grade: 'Grade 2',
    assessment: 'Practical Assessment',
    id: 'ADM-2024-M03-8472',
    date: 'November 15, 2026',
    time: '09:30 AM',
    venue: 'Conservatory Hall A',
  },
  {
    applicationId: 'APP-9931-24',
    subject: 'Veena',
    grade: 'Diploma',
    assessment: 'Practical Assessment',
    id: 'ADM-2024-F02-1934',
    date: 'November 16, 2026',
    time: '11:00 AM',
    venue: 'Studio Chamber C',
  },
  {
    applicationId: 'APP-7721-24',
    subject: 'Bharatanatyam',
    grade: 'Grade 5',
    assessment: 'Theory Assessment',
    id: 'ADM-2024-V03-5521',
    date: 'November 20, 2026',
    time: '02:15 PM',
    venue: 'Grand Auditorium',
  },
];

export const results = [
  {
    id: 'veena-diploma',
    subject: 'Veena',
    grade: 'Diploma',
    score: 85,
    classification: 'Merit',
    date: 'October 05, 2024',
  },
  {
    id: 'bharatanatyam-grade-5',
    subject: 'Bharatanatyam',
    grade: 'Grade 5',
    score: 94,
    classification: 'Distinction',
    date: 'November 12, 2024',
  },
  {
    id: 'mridangam-grade-2',
    subject: 'Mridangam',
    grade: 'Grade 2',
    score: 88,
    detailScore: 94,
    classification: 'Merit',
    detailClassification: 'Distinction',
    date: 'September 22, 2024',
  },
];

export const mcqQuestions = [
  {
    category: 'Harmony & Form',
    question: "Identify the correct structural definition of a 'Sonata-Allegro' form's exposition section from the options provided below. Consider the thematic presentation and typical harmonic trajectory.",
    imageLabel: 'Rondo Form (A-B-A-C-A)',
    options: [
      'Presentation of main theme in tonic, followed by a secondary theme in a related key (often dominant), concluding with a closing theme or codetta.',
      'Extensive motivic development of previously stated themes, characterized by harmonic instability and frequent modulations.',
      'A recurring primary theme (A) alternating with contrasting episodes (B, C, etc.), typically mapped as ABACA.',
      'Restatement of the main and secondary themes, but both are resolved into the tonic key to provide structural closure.',
    ],
    answer: 0,
    explanation: 'The exposition introduces the principal thematic material and establishes the tonal contrast that later sections develop and resolve.',
  },
  {
    category: 'Rhythm',
    question: 'Which tala cycle is commonly counted as eight beats in Carnatic music?',
    imageLabel: 'Adi Tala',
    options: ['Adi Tala', 'Rupaka Tala', 'Jhampa Tala', 'Misra Chapu'],
    answer: 0,
    explanation: 'Adi Tala is an eight-beat cycle and is one of the most common rhythmic frameworks in Carnatic repertoire.',
  },
  {
    category: 'Intervals',
    question: 'Which interval is found between the root and seventh of a fully diminished seventh chord?',
    imageLabel: 'Diminished 7th',
    options: ['Major 7th', 'Minor 7th', 'Diminished 7th', 'Perfect 5th'],
    answer: 2,
    explanation: 'A fully diminished seventh chord is built from stacked minor thirds, placing a diminished seventh above the root.',
  },
  {
    category: 'Notation',
    question: 'What marking tells a performer to gradually become softer?',
    imageLabel: 'Dynamics',
    options: ['Crescendo', 'Ritardando', 'Diminuendo', 'Marcato'],
    answer: 2,
    explanation: 'Diminuendo indicates a gradual decrease in volume.',
  },
];
