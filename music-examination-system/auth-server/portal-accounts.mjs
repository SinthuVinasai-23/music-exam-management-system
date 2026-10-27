import crypto from "node:crypto";
import {
  approved,
  childKey,
  guardianAge,
  yearAge,
} from "../src/student/rules.js";
const hash = (value) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return (
    "scrypt:" + salt + ":" + crypto.scryptSync(value, salt, 32).toString("hex")
  );
};
const matchesPassword = (value, stored) => {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, key] = stored.split(":");
  return crypto.timingSafeEqual(
    crypto.scryptSync(value, salt, 32),
    Buffer.from(key, "hex"),
  );
};
export function accountAdapter(
  localStorage,
  sessionStorage,
  { approvalRequired = false } = {},
) {
  const sessionKey = "musicApplicantPreview";
  const studentKey = "musicDemoAccounts";
  const parentKey = "musicDemoParents";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanName = (value) => (value || "").trim().replace(/\s+/g, " ");
  const email = (value) => (value || "").trim().toLowerCase();
  const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
  const write = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value));

  function demoSession() {
    try {
      return (
        JSON.parse(sessionStorage.getItem(sessionKey)) || {
          user: null,
          pending: null,
        }
      );
    } catch {
      return { user: null, pending: null };
    }
  }
  function safeAccount(account) {
    const { password, confirmPassword, ...safe } = account;
    return safe;
  }
  function saveSession(data) {
    sessionStorage.setItem(sessionKey, JSON.stringify(data));
    return data;
  }
  function validateChild(child) {
    if (
      cleanName(child.firstName).length > 100 ||
      cleanName(child.lastName).length > 100
    )
      throw new Error("Use names of 100 characters or fewer.");
    if (!cleanName(child.firstName) || !cleanName(child.lastName))
      throw new Error("Enter the student’s first and last names.");
    const dob = child.dateOfBirth;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dob || "") ||
      Number.isNaN(Date.parse(dob)) ||
      new Date(dob).toISOString().slice(0, 10) !== dob ||
      new Date(`${dob}T00:00:00`) > new Date()
    )
      throw new Error("Enter a valid date of birth.");
    if (yearAge(dob) < 6)
      throw new Error(
        "The child must be at least 6 years old to take the examination.",
      );
    if (child.email && !emailPattern.test(email(child.email)))
      throw new Error("Enter a valid student email address.");
  }
  function validateCredentials(values) {
    if (!emailPattern.test(email(values.email)))
      throw new Error("Enter a valid email address.");
    if (!values.phone?.trim()) throw new Error("Enter a phone number.");
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(values.password || ""))
      throw new Error(
        "Use at least 8 password characters with letters and numbers.",
      );
    if (values.password !== values.confirmPassword)
      throw new Error("Passwords do not match.");
  }
  function createStudent(child, students, parentId = null, credentials = {}) {
    validateChild(child);
    if (students.some((student) => childKey(student) === childKey(child)))
      throw new Error(
        "This student appears to already be registered. Please check the existing student account.",
      );
    const year = new Date().getFullYear();
    const serial =
      Math.max(
        Number(localStorage.getItem(`musicStudentSerial-${year}`) || 0),
        0,
        ...students
          .filter((s) => s.registrationYear === year)
          .map((s) => Number(s.student_id?.split("/")[1]) || 0),
      ) + 1;
    const student_id = `${year}/${String(serial).padStart(4, "0")}`;
    const firstName = cleanName(child.firstName),
      lastName = cleanName(child.lastName);
    const student = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      dateOfBirth: child.dateOfBirth,
      phone: child.phone?.trim() || "",
      email: email(child.email),
      ...credentials,
      role: "student",
      student_id,
      id: student_id,
      parentId,
      registrationYear: year,
      registrationStatus: approvalRequired ? "pending" : approved(),
      verificationStatus: parentId ? "approved" : "pending",
      subjectProgress: {},
    };
    return { student, serial };
  }
  function pendingSession(account) {
    return saveSession({
      user: null,
      pending: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        registrationStatus: account.registrationStatus,
        delivery: "preview",
        resendAt: 0,
      },
    });
  }
  function parentChildren(parentId) {
    return read(studentKey)
      .filter((s) => s.parentId === parentId)
      .map(safeAccount);
  }
  function selectParentChild(studentId) {
    const session = demoSession();
    const child = parentChildren(session.user?.id).find(
      (s) => s.student_id === studentId,
    );
    if (session.user?.role !== "parent" || !child)
      throw new Error(
        "This candidate is not associated with your parent account.",
      );
    saveSession({ ...session, activeStudentId: child.student_id });
    return child;
  }
  function currentParentChild() {
    const session = demoSession();
    return session.user?.role === "parent"
      ? parentChildren(session.user.id).find(
          (s) => s.student_id === session.activeStudentId,
        )
      : null;
  }
  function demoRequest(action, values = {}) {
    const students = read(studentKey),
      parents = read(parentKey);
    const session = demoSession();
    if (action === "register") {
      if (!["student", "parent"].includes(values.role))
        throw new Error("Select Student or Parent registration.");
      if (values.role === "student") {
        validateChild(values);
        if (guardianAge(values.dateOfBirth) < 16)
          throw new Error(
            "You are under 16 years old. A parent or guardian must register on your behalf.",
          );
        validateCredentials(values);
        const { student, serial } = createStudent(values, students, null, {
          password: hash(values.password),
        });
        write(studentKey, [...students, student]);
        localStorage.setItem(
          `musicStudentSerial-${student.registrationYear}`,
          String(serial),
        );
        return pendingSession(student);
      }
      const parent = values.parent || {};
      if (!cleanName(parent.firstName) || !cleanName(parent.lastName))
        throw new Error("Enter the parent’s first and last names.");
      validateCredentials(parent);
      if (parents.some((p) => email(p.email) === email(parent.email)))
        throw new Error(
          "This parent account already exists. Log in and use Add New Candidate.",
        );
      const parentId = `PAR-${crypto.randomUUID()}`;
      // Parent accounts can be created independently. Optional child payloads from
      // older clients remain supported without changing existing relationships.
      const initialChild = values.child ? createStudent(values.child, students, parentId) : null;
      if (initialChild) initialChild.student.verificationStatus = "pending";
      const firstName = cleanName(parent.firstName),
        lastName = cleanName(parent.lastName);
      const account = {
        id: parentId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone: parent.phone.trim(),
        email: email(parent.email),
        password: hash(parent.password),
        role: "parent",
        registrationStatus: approved(),
        verificationStatus: "pending",
      };
      write(parentKey, [...parents, account]);
      if (initialChild) {
        const { student, serial } = initialChild;
        write(studentKey, [...students, student]);
        localStorage.setItem(`musicStudentSerial-${student.registrationYear}`, String(serial));
      }
      return pendingSession(account);
    }
    if (action === "verify") {
      if (!session.pending)
        throw new Error("Please register or log in to verify your account.");
      if (values.code !== "123456")
        throw new Error("Invalid verification code");
      const collection = session.pending.role === "parent" ? parents : students;
      const account = collection.find((a) => a.id === session.pending.id);
      if (!account || account.registrationStatus === "rejected")
        throw new Error(
          "This registration has been rejected. Contact the examination office.",
        );
      account.verificationStatus = approved();
      write(
        session.pending.role === "parent" ? parentKey : studentKey,
        collection,
      );
      if (account.role === "parent") {
        students
          .filter((s) => s.parentId === account.id)
          .forEach((s) => {
            s.verificationStatus = approved();
          });
        write(studentKey, students);
      }
      return saveSession({ user: safeAccount(account), pending: null });
    }
    if (action === "resend") {
      if (!session.pending)
        throw new Error("No account is waiting for verification.");
      return {
        ...session,
        message: "Your development verification code remains valid.",
      };
    }
    if (action === "login") {
      const collection = values.role === "parent" ? parents : students;
      const matches = collection.filter(
        (a) =>
          (a.student_id === values.email.trim() ||
            email(a.email) === email(values.email)) &&
          a.password &&
          matchesPassword(values.password, a.password),
      );
      if (matches.length !== 1)
        throw new Error(
          matches.length > 1
            ? "Use your permanent Student ID to choose your account."
            : "Account or password incorrect. Check your account type and credentials.",
        );
      const account = matches[0];
      if (account.verificationStatus !== "approved")
        return pendingSession(account);
      return saveSession({ user: safeAccount(account), pending: null });
    }
    if (action === "add-candidate") {
      if (
        session.user?.role !== "parent" ||
        session.user.verificationStatus !== "approved"
      )
        throw new Error("Log in to your verified parent account first.");
      const { student, serial } = createStudent(
        values,
        students,
        session.user.id,
      );
      write(studentKey, [...students, student]);
      localStorage.setItem(
        `musicStudentSerial-${student.registrationYear}`,
        String(serial),
      );
      return { student: safeAccount(student) };
    }
    if (action === "logout") return saveSession({ user: null, pending: null });
    throw new Error("Unsupported account action.");
  }

  return {
    demoRequest,
    demoSession,
    parentChildren,
    selectParentChild,
    currentParentChild,
  };
}
