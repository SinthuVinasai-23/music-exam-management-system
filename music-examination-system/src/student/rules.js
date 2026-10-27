export const gradeOrder = [
  "Level 1",
  "Level 2",
  "Grade 1",
  "Level 3",
  "Grade 2",
  "Level 4",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];
export const approved = () => "approved";
export const yearAge = (dob, year = new Date().getFullYear()) =>
  year - Number(dob.slice(0, 4));
export function guardianAge(dob, now = new Date()) {
  const date = new Date(`${dob}T00:00:00`);
  const beforeBirthday =
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  return yearAge(dob, now.getFullYear()) - (beforeBirthday ? 1 : 0);
}
export const childKey = (v) =>
  [
    (v.firstName || "").trim().replace(/\s+/g, " ").toLowerCase(),
    (v.lastName || "").trim().replace(/\s+/g, " ").toLowerCase(),
    v.dateOfBirth,
  ].join("|");
export function eligibleGrades(progress = {}) {
  const completed = progress.completedGrades || [];
  const last = Math.max(-1, ...completed.map((g) => gradeOrder.indexOf(g)));
  if (last >= 6) return gradeOrder.slice(last + 1, last + 2);
  // Demo syllabus permits entry to every early examination; backend can supply a narrower eligibility list.
  return gradeOrder
    .slice(0, 7)
    .filter(
      (g) =>
        !completed.includes(g) &&
        (!progress.eligibleGrades || progress.eligibleGrades.includes(g)),
    );
}
export function practiceGrades(progress = {}, activeGrades = []) {
  const index = Math.max(
    0,
    ...[
      progress.currentGrade,
      ...(progress.completedGrades || []),
      ...activeGrades,
    ].map((g) => gradeOrder.indexOf(g)),
  );
  return gradeOrder.slice(0, index + 1);
}
export function portalConfig() {
  const defaults = {
    session: {
      name: `Music Examination ${new Date().getFullYear()}`,
      openingDate: `${new Date().getFullYear()}-01-01`,
      deadline: `${new Date().getFullYear()}-12-31T23:59:59+05:30`,
    },
    about:
      "We support music education through examinations, practice and recognition of student achievement.",
  };
  try {
    const saved = JSON.parse(localStorage.getItem("musicExamConfig")) || {};
    return {
      ...defaults,
      ...saved,
      session: { ...defaults.session, ...saved.session },
    };
  } catch {
    return defaults;
  }
}
export function deadlineError(session, now = new Date()) {
  if (now < new Date(session.openingDate))
    return "Exam applications are not yet open.";
  if (now > new Date(session.deadline))
    return "Exam applications are closed. The application deadline has passed.";
  return "";
}
export function validateSelection(
  draft,
  profile,
  applications = [],
  session = portalConfig().session,
) {
  const closed = deadlineError(session);
  if (closed) return closed;
  if (
    profile.registrationStatus !== "approved" ||
    profile.verificationStatus !== "approved"
  )
    return "Registration and verification approval are required.";
  if (yearAge(profile.dateOfBirth || "") < 6)
    return "The child must be at least 6 years old to take the examination.";
  if (!draft.subjects?.length) return "Select at least one subject.";
  if (!["English", "Tamil"].includes(draft.preferredMedium))
    return "Select a preferred medium.";
  for (const subject of draft.subjects) {
    const choice = draft.subjectSelections?.[subject];
    const allowed = eligibleGrades(profile.subjectProgress?.[subject]);
    if (
      !choice?.teacher ||
      !choice.grades?.length ||
      choice.grades.some((g) => !allowed.includes(g)) ||
      new Set(choice.grades).size !== choice.grades.length
    )
      return `Select a teacher and eligible examinations for ${subject}.`;
    if (allowed.length <= 1 && choice.grades.length > 1)
      return `Select only the next examination for ${subject}.`;
    if (
      applications.some(
        (a) =>
          a.session === session.name &&
          a.applicationStatus !== "rejected" &&
          a.entries?.some(
            (e) => e.subject === subject && choice.grades.includes(e.grade),
          ),
      )
    )
      return `An active application already includes this examination for ${subject}.`;
  }
  return "";
}
