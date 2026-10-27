import {createAdminPortal} from './admin-portal.mjs';
import QRCode from 'qrcode';
import { createLearning } from "./learning.mjs";
import crypto from "node:crypto";
import { accountAdapter } from "./portal-accounts.mjs";
import { gradeOrder, yearAge } from "../src/student/rules.js";
import { teacherRecords } from "../src/student/data/studentData.js";
import { applicationPdf, admissionPdf, admissionPayload } from "./portal-pdf.mjs";
export async function createPortal(
  db,
  { clock = Date.now, config = process.env } = {},
) {
  // Temporary local-development access: syllabus clearance is optional by default.
  // Production and explicit strict mode retain the clearance requirement.
  const requireSyllabusClearance =
    config.NODE_ENV === "production" ||
    config.REQUIRE_SYLLABUS_CLEARANCE === "true";
  const autoApprove = config.AUTO_APPROVE_APPLICATIONS === "true";
  const get = (q, ...a) => db.prepare(q).get(...a),
    all = (q, ...a) => db.prepare(q).all(...a),
    run = (q, ...a) => db.prepare(q).run(...a);
  db.exec(`CREATE TABLE IF NOT EXISTS portal_values(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS portal_sessions(token TEXT PRIMARY KEY,csrf TEXT NOT NULL,state TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS exam_applications(id TEXT PRIMARY KEY,student_id TEXT NOT NULL,first_name TEXT NOT NULL,last_name TEXT NOT NULL,medium TEXT NOT NULL CHECK(medium IN ('English','Tamil')),session TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS exam_items(id TEXT PRIMARY KEY,application_id TEXT NOT NULL REFERENCES exam_applications(id),subject_id TEXT NOT NULL,grade TEXT NOT NULL,teacher_id TEXT NOT NULL,school TEXT NOT NULL,status TEXT NOT NULL,review_note TEXT NOT NULL DEFAULT '',reviewed INTEGER,updated INTEGER NOT NULL,UNIQUE(application_id,subject_id,grade));
 CREATE TABLE IF NOT EXISTS exam_documents(application_id TEXT PRIMARY KEY REFERENCES exam_applications(id),pdf BLOB NOT NULL,generated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS exam_teacher ON exam_items(teacher_id,status);
 CREATE TABLE IF NOT EXISTS exam_progress(student_id TEXT NOT NULL,subject_id TEXT NOT NULL,grade TEXT NOT NULL,passed INTEGER NOT NULL DEFAULT 0,syllabus INTEGER NOT NULL DEFAULT 0,result_status TEXT NOT NULL DEFAULT '',updated INTEGER NOT NULL,PRIMARY KEY(student_id,subject_id,grade));
 CREATE TABLE IF NOT EXISTS exam_audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS exam_staff(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL);`);
  if (autoApprove) {
    // Temporary preview mode: make existing pending applications downloadable.
    db.exec("BEGIN");
    try {
      run("UPDATE exam_items SET status='approved',reviewed=?,updated=? WHERE status='pending' AND application_id IN (SELECT id FROM exam_applications WHERE status='pending')", clock(), clock());
      run("UPDATE exam_applications SET status='approved',updated=? WHERE status='pending' AND NOT EXISTS (SELECT 1 FROM exam_items WHERE application_id=exam_applications.id AND status!='approved')", clock());
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  db.exec("CREATE TABLE IF NOT EXISTS exam_location_preferences(application_id TEXT PRIMARY KEY REFERENCES exam_applications(id),location TEXT NOT NULL)");
  const examLocations = () => {const venues=value("admin_portal_state")?.venues;return venues ? [...new Set(venues.filter(v=>v.status==='Active').map(v=>v.location))] : ["Ajex", "Scarborough", "Brampton"];};
  const hash = (v) => {
    const salt = crypto.randomBytes(16).toString("hex");
    return salt + ":" + crypto.scryptSync(v, salt, 32).toString("hex");
  };
  const check = (v, h) => {
    const [salt, key] = h.split(":");
    return crypto.timingSafeEqual(
      crypto.scryptSync(v, salt, 32),
      Buffer.from(key, "hex"),
    );
  };
  const put = (k, v) =>
    run(
      "INSERT INTO portal_values VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      k,
      JSON.stringify(v),
    );
  const value = (k, fallback) => {
    const row = get("SELECT value FROM portal_values WHERE key=?", k);
    return row ? JSON.parse(row.value) : fallback;
  };
  if (!value("admission_qr_secret")) put("admission_qr_secret", crypto.randomBytes(32).toString("hex"));
  db.exec("CREATE TABLE IF NOT EXISTS examiner_component_marks(item_id TEXT PRIMARY KEY REFERENCES exam_items(id), theory REAL, practical REAL, updated INTEGER NOT NULL)");
  const admissionToken = id => crypto.createHmac("sha256", value("admission_qr_secret")).update(id).digest("hex");
  if (!get("SELECT 1 FROM portal_values WHERE key=?", "exam_config")) {
    const year = new Date(clock()).getFullYear();
    put("exam_config", {
      session: {
        name: `Music Examination ${year}`,
        openingDate: `${year}-01-01T00:00:00+05:30`,
        deadline: `${year}-12-31T23:59:59+05:30`,
      },
      about:
        "Supporting music education through examinations and recognition of achievement.",
    });
  }
  // Development credentials are seeded only outside production; deployment uses configured credentials.
  if (config.NODE_ENV !== "production" || config.PORTAL_ADMIN_PASSWORD) {
    const password = config.PORTAL_ADMIN_PASSWORD || "EnsembleAdmin2026";
    if (!get("SELECT 1 FROM exam_staff WHERE id=?", "admin"))
      run(
        "INSERT INTO exam_staff VALUES(?,?,?,?,?)",
        "admin",
        config.PORTAL_ADMIN_EMAIL || "admin@ensemble.local",
        hash(password),
        "admin",
        "Examinations Administrator",
      );
  }
  if ((config.NODE_ENV !== "production" || config.PORTAL_EXAMINER_PASSWORD) && !get("SELECT 1 FROM exam_staff WHERE id=?","examiner"))
    run("INSERT INTO exam_staff VALUES(?,?,?,?,?)","examiner",config.PORTAL_EXAMINER_EMAIL || "examiner@icfa.local",hash(config.PORTAL_EXAMINER_PASSWORD || "ICFAExaminer2026"),"examiner","ICFA Examiner");
  for (const teacher of teacherRecords)
    if (
      config.NODE_ENV !== "production" &&
      !get("SELECT 1 FROM exam_staff WHERE id=?", teacher.id)
    )
      run(
        "INSERT INTO exam_staff VALUES(?,?,?,?,?)",
        teacher.id,
        `${teacher.id}@ensemble.local`,
        hash("EnsembleTeacher2026"),
        "teacher",
        teacher.name,
      );
  for(const staff of all("SELECT id,name FROM exam_staff WHERE role='teacher'")) {
    if(!teacherRecords.some(t=>t.id===staff.id))teacherRecords.push({id:staff.id,name:staff.name,school:value('admin_portal_state')?.staffMeta?.[staff.id]?.speciality||'ICFA',subjects:[]});
  }
  function limit(key, max, windowMs) {
    const old = get("SELECT * FROM auth_limits WHERE key=?", key);
    if (!old || old.start + windowMs <= clock())
      run(
        "INSERT INTO auth_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,start=excluded.start",
        key,
        clock(),
      );
    else {
      if (old.count >= max) failure(429, "Too many attempts. Try again later.");
      run("UPDATE auth_limits SET count=count+1 WHERE key=?", key);
    }
  }
  const audit = (actor, action, target) =>
    run(
      "INSERT INTO exam_audit(actor,action,target,created) VALUES(?,?,?,?)",
      actor,
      action,
      target,
      clock(),
    );
  function failure(status, message) {
    const e = new Error(message);
    e.status = status;
    throw e;
  }
  const students = () => value("musicDemoAccounts", []);
  const learning = createLearning(db, {
    clock,
    config,
    audit,
    failure,
    value,
    put,
    students,
  });
  const subjectDirectory = () => learning.directory();
  function safeStudent(s) {
    const { password, confirmPassword, ...p } = s;
    const progress = {};
    for (const subject of subjectDirectory()) {
      const rows = all(
        "SELECT * FROM exam_progress WHERE student_id=? AND subject_id=?",
        s.student_id,
        subject.id,
      );
      progress[subject.name] = {
        completedGrades: gradeOrder.filter((g) =>
          rows.some((r) => r.grade === g && r.passed),
        ),
        currentGrade: subject.active
          ? learning.context(s, subject.id).currentGrade
          : undefined,
        eligibleGrades: eligibility(s, subject.id)
          .filter((g) => g.eligible)
          .map((g) => g.grade),
        records: rows,
      };
    }
    return {
      ...p,
      subjectProgress: progress,
      results: learning.resultsFor(s.student_id),
      preferredMedium: learning.preferredMedium(s.student_id),
    };
  }
  function application(row, teacherId) {
    const entries = all(
      "SELECT * FROM exam_items WHERE application_id=? ORDER BY rowid",
      row.id,
    )
      .filter((i) => !teacherId || i.teacher_id === teacherId)
      .map((i) => ({
        ...i,
        subject: subjectDirectory().find((s) => s.id === i.subject_id)?.name,
        grade: i.grade,
        teacher: teacherRecords.find((t) => t.id === i.teacher_id)?.name,
        teacherId: i.teacher_id,
        teacherSchool: i.school,
        approvalStatus: i.status,
        reviewNote: i.review_note,
        ...(()=>{const admin=value('admin_portal_state',{});const slot=admin.slots?.find(s=>s.id===admin.workflows?.[row.id]?.slotId);return slot?{examDate:slot.date,examTime:slot.start,examVenue:admin.venues?.find(v=>v.id===slot.venueId)?.name}:{};})(),
        teacherApprovalDate: i.reviewed
          ? new Date(i.reviewed).toISOString()
          : null,
      }));
    return {
      id: row.id,
      studentId: row.student_id,
      firstName: row.first_name,
      lastName: row.last_name,
      candidateName: `${row.first_name} ${row.last_name}`,
      session: row.session,
      preferredMedium: row.medium,
      preferredLocation: get("SELECT location FROM exam_location_preferences WHERE application_id=?", row.id)?.location || "Not selected",
      applicationDate: new Date(row.created).toISOString(),
      updatedAt: new Date(row.updated).toISOString(),
      applicationStatus: row.status,
      teacherApprovalStatus: row.status,
      adminApprovalStatus: row.status === "approved" ? "approved" : "pending",
      verificationStatus: "approved",
      admissionAvailable: row.status === "approved",
      entries,
      subjects: [...new Set(entries.map((i) => i.subject))],
      grade: entries[0]?.grade,
      title: entries.map((i) => `${i.subject} · ${i.grade}`).join(", "),
    };
  }
  function eligibility(student, subjectId) {
    const rows = all(
      "SELECT * FROM exam_progress WHERE student_id=? AND subject_id=?",
      student.student_id,
      subjectId,
    );
    const passed = rows.filter((r) => r.passed).map((r) => r.grade);
    const advanced = gradeOrder.slice(6).filter((g) => passed.includes(g));
    const highest = advanced.length
      ? Math.max(...advanced.map((g) => gradeOrder.indexOf(g)))
      : -1;
    return gradeOrder.map((grade, index) => {
      let reason = "";
      if (yearAge(student.dateOfBirth, new Date(clock()).getFullYear()) < 6)
        reason = "You must be at least 6 in the examination year.";
      else if (passed.includes(grade))
        reason = "This examination is already completed.";
      else if (index >= 7 && !passed.includes(gradeOrder[index - 1]))
        reason = `Complete ${gradeOrder[index - 1]} in ${subjectDirectory().find((s) => s.id === subjectId)?.name} before applying.`;
      else if (highest >= 6 && index !== highest + 1)
        reason = "Only the next examination is available after Grade 3.";
      else if (index >= 7 && highest < 6)
        reason = "Complete Grade 3 before applying.";
      const progress = rows.find((r) => r.grade === grade);
      if (!reason && requireSyllabusClearance && !progress?.syllabus)
        reason = "Teacher or Admin must confirm syllabus completion.";
      if (!reason && ["pending", "withheld"].includes(progress?.result_status))
        reason = "A previous examination result is still pending or withheld.";
      const duplicate = get(
        `SELECT 1 FROM exam_items i JOIN exam_applications a ON a.id=i.application_id WHERE a.student_id=? AND i.subject_id=? AND i.grade=? AND i.status IN ('pending','approved')`,
        student.student_id,
        subjectId,
        grade,
      );
      if (!reason && duplicate && progress?.result_status !== "failed")
        reason =
          "An active application already includes this subject and grade.";
      return { grade, eligible: !reason, reason };
    });
  }
  function recompute(id) {
    const statuses = all(
      "SELECT status FROM exam_items WHERE application_id=?",
      id,
    ).map((i) => i.status);
    const status = statuses.includes("rejected")
      ? "rejected"
      : statuses.includes("changes-required")
        ? "changes-required"
        : statuses.every((s) => s === "approved")
          ? "approved"
          : "pending";
    run(
      "UPDATE exam_applications SET status=?,updated=? WHERE id=?",
      status,
      clock(),
      id,
    );
  }
  const adminHandle=createAdminPortal({db,value,put,students,safeStudent,application,audit,clock,failure,hash,recompute,subjectDirectory});
  return async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/portal/")) return false;
    const reply = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    try {
      const cookie = (req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("music_portal="))
        ?.slice(13);
      let session = cookie
        ? get(
            "SELECT * FROM portal_sessions WHERE token=? AND expires>?",
            crypto.createHash("sha256").update(cookie).digest("hex"),
            clock(),
          )
        : null;
      if (!session) {
        const raw = crypto.randomBytes(32).toString("hex"),
          token = crypto.createHash("sha256").update(raw).digest("hex"),
          csrf = crypto.randomBytes(32).toString("hex");
        run(
          "INSERT INTO portal_sessions VALUES(?,?,?,?)",
          token,
          csrf,
          "{}",
          clock() + 28800000,
        );
        session = get("SELECT * FROM portal_sessions WHERE token=?", token);
        res.setHeader(
          "Set-Cookie",
          `music_portal=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${config.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
      }
      const localStorage = {
        getItem: (key) =>
          get("SELECT value FROM portal_values WHERE key=?", key)?.value ||
          null,
        setItem: (key, v) =>
          run(
            "INSERT INTO portal_values VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            key,
            v,
          ),
      };
      const sessionStorage = {
        getItem: () => session.state,
        setItem: (_, v) => {
          session.state = v;
          run(
            "UPDATE portal_sessions SET state=? WHERE token=?",
            v,
            session.token,
          );
        },
      };
      const adapter = accountAdapter(localStorage, sessionStorage, {
        approvalRequired: config.REGISTRATION_APPROVAL_REQUIRED === "true",
      });
      let state = adapter.demoSession();
      if (state.user?.role === "student") {
        const found = students().find((s) => s.id === state.user.id);
        state.user = found ? safeStudent(found) : null;
      } else if (state.user?.role === "parent") {
        const found = value("musicDemoParents", []).find(
          (s) => s.id === state.user.id,
        );
        if (found) {
          const { password, ...safe } = found;
          state.user = safe;
        } else state.user = null;
      }
      if (['admin','teacher','examiner','invigilator'].includes(state.user?.role)) {
        const staff=get('SELECT id,name,email,role FROM exam_staff WHERE id=?',state.user.id);
        state.user=staff && value('admin_portal_state')?.staffMeta?.[staff.id]?.status!=='Inactive' ? {...staff,registrationStatus:'approved',verificationStatus:'approved'} : null;
      }
      const role = state.user?.role;
      const requireRole = (...roles) => {
        if (!roles.includes(role))
          failure(
            state.user ? 403 : 401,
            "Sign in with an authorized account.",
          );
      };
      const studentFor = (id) => {
        requireRole("student", "parent");
        const student = students().find(
          (s) =>
            s.student_id ===
            (id || state.activeStudentId || state.user.student_id),
        );
        if (
          !student ||
          !(role === "student"
            ? student.id === state.user.id
            : student.parentId === state.user.id)
        )
          failure(403, "This candidate does not belong to your account.");
        if (student.registrationStatus !== "approved")
          failure(403, "Student registration approval is required.");
        if (student.verificationStatus !== "approved")
          failure(403, "Student verification is required.");
        return student;
      };
      let data = {};
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.headers["x-csrf-token"] !== session.csrf)
          failure(403, "Session expired. Refresh and try again.");
        if (
          req.headers.origin &&
          ![config.APP_URL || "http://127.0.0.1:5173", config.PUBLIC_APP_URL].filter(Boolean).includes(req.headers.origin)
        )
          failure(403, "Invalid request origin.");
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 65536)
            failure(413, "Request too large.");
        }
        try {
          data = JSON.parse(body || "{}");
          if (!data || Array.isArray(data) || typeof data !== "object")
            throw Error();
        } catch {
          failure(400, "Invalid request body.");
        }
      }
      const route = url.pathname.slice("/api/portal/".length);
      if(await adminHandle({route,req,data,reply,requireRole,state}))return true;
      if (
        await learning.handle({
          req,
          route,
          url,
          data,
          reply,
          requireRole,
          studentFor,
          state,
          session,
          limit,
          sessionStorage,
        })
      )
        return true;
      const stateReply = () => ({
        ...state,
        csrf: session.csrf,
        children:
          role === "parent"
            ? adapter.parentChildren(state.user.id).map(safeStudent)
            : [],
        selectedStudent:
          role === "parent"
            ? (() => {
                const s = students().find(
                  (s) =>
                    s.student_id === state.activeStudentId &&
                    s.parentId === state.user.id,
                );
                return s ? safeStudent(s) : null;
              })()
            : null,
      });
      if (route === "session" && req.method === "GET") {
        reply(200, stateReply());
        return true;
      }
      if (route === "preview-admin-login" && req.method === "POST") {
        if (config.NODE_ENV === 'production' || config.PREVIEW_ADMIN_ACCESS !== 'true' || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) failure(403,'Preview admin access is unavailable.');
        state={user:{id:'admin',name:'ICFA Preview Administrator',role:'admin',registrationStatus:'approved',verificationStatus:'approved'},pending:null};
        sessionStorage.setItem('',JSON.stringify(state));
        reply(200,stateReply());return true;
      }
      if (route === "staff-login" && req.method === "POST") {
        limit(
          "portal-staff:" +
            req.socket.remoteAddress +
            ":" +
            String(data.email || "").toLowerCase(),
          10,
          900000,
        );
        const staff = get(
          "SELECT * FROM exam_staff WHERE lower(email)=lower(?)",
          String(data.email || "").trim(),
        );
        if (
          !staff ||
          value("admin_portal_state")?.staffMeta?.[staff?.id]?.status==='Inactive' ||
          typeof data.password !== "string" ||
          data.password.length > 128 ||
          !check(data.password, staff.password_hash)
        )
          failure(401, "Incorrect staff email or password.");
        state = {
          user: {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            registrationStatus: "approved",
            verificationStatus: "approved",
          },
          pending: null,
        };
        sessionStorage.setItem("", JSON.stringify(state));
        reply(200, stateReply());
        return true;
      }
      if (
        [
          "register",
          "verify",
          "resend",
          "login",
          "add-candidate",
          "logout",
        ].includes(route) &&
        req.method === "POST"
      ) {
        if (
          config.NODE_ENV === "production" &&
          ["register", "verify", "resend", "login", "recover"].includes(route)
        )
          failure(
            503,
            "Configure production applicant authentication before enabling this development adapter.",
          );
        limit(
          "portal-" + route + ":" + req.socket.remoteAddress,
          route === "register" ? 30 : 100,
          3600000,
        );
        if ((data.password?.length || data.parent?.password?.length || 0) > 128)
          failure(400, "Password must not exceed 128 characters.");
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = adapter.demoRequest(route, data);
          state = adapter.demoSession();
          db.exec("COMMIT");
          reply(route === "register" ? 201 : 200, {
            ...result,
            csrf: session.csrf,
          });
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return true;
      }
      if (route === "student-profile" && req.method === "PUT") {
        const student = studentFor(data.studentId);
        if (Object.keys(data).some(k => !["studentId", "email"].includes(k))) failure(400, "Only email can be edited directly. Name changes require admin approval.");
        const email = String(data.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) failure(400, "Enter a valid email address.");
        if (students().some(s => s.id !== student.id && s.email?.toLowerCase() === email) || value("musicDemoParents", []).some(p => p.email?.toLowerCase() === email)) failure(409, "This email is already in use.");
        put("musicDemoAccounts", students().map(s => s.id === student.id ? {...s, email} : s));
        audit(state.user.id, "student-email-updated", student.student_id);
        reply(200, {student: safeStudent({...student, email})}); return true;
      }
      if (route === "name-change" && req.method === "POST") {
        const student = studentFor(data.studentId);
        const firstName = String(data.firstName || "").trim(), lastName = String(data.lastName || "").trim();
        if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) failure(400, "Enter first and last names of up to 100 characters.");
        if (firstName === student.firstName && lastName === student.lastName) failure(400, "Enter the requested new name.");
        const request = {firstName, lastName, status: "pending", requestedAt: new Date(clock()).toISOString()};
        put("musicDemoAccounts", students().map(s => s.id === student.id ? {...s, nameChangeRequest: request} : s));
        audit(state.user.id, "name-change-requested", student.student_id);
        reply(200, {request}); return true;
      }
      if (route === "name-change" && req.method === "PATCH") {
        requireRole("admin");
        const student = students().find(s => s.student_id === data.studentId);
        if (!student?.nameChangeRequest || student.nameChangeRequest.status !== "pending") failure(404, "No pending name change.");
        if (!["approved", "rejected"].includes(data.status)) failure(400, "Choose approved or rejected.");
        const request = {...student.nameChangeRequest, status: data.status, reviewedBy: state.user.id, reviewedAt: new Date(clock()).toISOString()};
        const updated = {...student, nameChangeRequest: request};
        if (data.status === "approved") { updated.firstName=request.firstName; updated.lastName=request.lastName; updated.name=`${request.firstName} ${request.lastName}`; }
        put("musicDemoAccounts", students().map(s => s.id === student.id ? updated : s));
        audit(state.user.id, `name-change-${data.status}`, student.student_id);
        reply(200, {student: safeStudent(updated)}); return true;
      }
      if (route === "select-child" && req.method === "POST") {
        requireRole("parent");
        const child = adapter.selectParentChild(data.studentId);
        reply(200, safeStudent(child));
        return true;
      }
      if (route === "config" && req.method === "GET") {
        reply(200, {
          ...value("exam_config"),
          serverTime: new Date(clock()).toISOString(),
        });
        return true;
      }
      if (route === "config" && req.method === "PUT") {
        requireRole("admin");
        const { session: s, about = "" } = data;
        if (
          !s?.name?.trim() ||
          !Number.isFinite(Date.parse(s.openingDate)) ||
          !Number.isFinite(Date.parse(s.deadline)) ||
          Date.parse(s.deadline) < Date.parse(s.openingDate)
        )
          failure(
            400,
            "Provide a session name and valid opening/deadline dates.",
          );
        put("exam_config", {
          session: {
            name: s.name.trim(),
            openingDate: new Date(s.openingDate).toISOString(),
            deadline: new Date(s.deadline).toISOString(),
          },
          about: String(about).slice(0, 5000),
          updatedBy: state.user.id,
          updatedAt: new Date(clock()).toISOString(),
        });
        audit(state.user.id, "deadline-updated", s.name);
        reply(200, value("exam_config"));
        return true;
      }
      if (route === "catalog" && req.method === "GET") {
        const student = studentFor(url.searchParams.get("studentId"));
        reply(200, {
          subjects: subjectDirectory()
            .filter((s) => s.active)
            .map((s) => ({
              ...s,
              grades: eligibility(student, s.id),
            })),
          teachers: teacherRecords,
          student: safeStudent(student),
          config: {...value("exam_config"), locations: examLocations()},
        });
        return true;
      }
      if (route === "students" && req.method === "GET") {
        requireRole("admin", "teacher");
        reply(200, {
          students: students()
            .filter(
              (s) =>
                role === "admin" ||
                get(
                  "SELECT 1 FROM exam_applications a JOIN exam_items i ON i.application_id=a.id WHERE a.student_id=? AND i.teacher_id=?",
                  s.student_id,
                  state.user.id,
                ),
            )
            .map(safeStudent),
          subjects: subjectDirectory(),
          teachers: teacherRecords,
        });
        return true;
      }
      if (route === "progress" && req.method === "PUT") {
        requireRole("admin", "teacher");
        const student = students().find((s) => s.student_id === data.studentId);
        if (
          !student ||
          !subjectDirectory().some((s) => s.id === data.subjectId) ||
          !gradeOrder.includes(data.grade) ||
          !["", "pending", "withheld", "passed", "failed"].includes(
            data.resultStatus || "",
          )
        )
          failure(400, "Select an existing student, subject and grade.");
        if (
          data.passed === true &&
          ["pending", "withheld", "failed"].includes(data.resultStatus)
        )
          failure(
            400,
            "A pending, withheld or failed result cannot be marked passed.",
          );
        if (
          role === "teacher" &&
          !get(
            "SELECT 1 FROM exam_items i JOIN exam_applications a ON a.id=i.application_id WHERE a.student_id=? AND i.subject_id=? AND i.teacher_id=?",
            data.studentId,
            data.subjectId,
            state.user.id,
          )
        )
          failure(
            403,
            "Only Admin can establish new student subject eligibility.",
          );
        run(
          `INSERT INTO exam_progress VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,subject_id,grade) DO UPDATE SET passed=excluded.passed,syllabus=excluded.syllabus,result_status=excluded.result_status,updated=excluded.updated`,
          data.studentId,
          data.subjectId,
          data.grade,
          data.passed === true ? 1 : 0,
          data.syllabusCompleted === true ? 1 : 0,
          data.resultStatus || "",
          clock(),
        );
        audit(
          state.user.id,
          "progress-updated",
          `${data.studentId}/${data.subjectId}/${data.grade}`,
        );
        reply(200, safeStudent(student));
        return true;
      }
      if (route === "applications" && req.method === "GET") {
        let rows;
        if (role === "admin")
          rows = all("SELECT * FROM exam_applications ORDER BY created DESC");
        else if (role === "teacher")
          rows = all(
            "SELECT DISTINCT a.* FROM exam_applications a JOIN exam_items i ON i.application_id=a.id WHERE i.teacher_id=? ORDER BY a.created DESC",
            state.user.id,
          );
        else {
          const student = studentFor(url.searchParams.get("studentId"));
          rows = all(
            "SELECT * FROM exam_applications WHERE student_id=? ORDER BY created DESC",
            student.student_id,
          );
        }
        let apps = rows.map((r) =>
          application(r, role === "teacher" ? state.user.id : null),
        );
        for (const [key, v] of url.searchParams) {
          if (!v || (key === "studentId" && role !== "admin")) continue;
          const q = v.toLowerCase();
          apps = apps.filter((a) =>
            (
              ({
                student: `${a.studentId} ${a.candidateName}`,
                studentId: a.studentId,
                medium: a.preferredMedium,
                status: a.applicationStatus,
              })[key] ||
              a.entries
                .map(
                  (i) =>
                    ({
                      subject: i.subject,
                      grade: i.grade,
                      teacher: i.teacher,
                      school: i.teacherSchool,
                    })[key] || "",
                )
                .join(" ")
            )
              .toLowerCase()
              .includes(q),
          );
        }
        reply(200, { applications: apps });
        return true;
      }
      if (route === "applications" && req.method === "POST") {
        const student = studentFor(data.studentId),
          cfg = value("exam_config").session;
        const now = clock();
        if (now < Date.parse(cfg.openingDate))
          failure(409, "Exam applications are not yet open.");
        if (now > Date.parse(cfg.deadline))
          failure(
            409,
            "Exam applications are closed. The application deadline has passed.",
          );
        if (data.preferredLocation && !examLocations().includes(data.preferredLocation)) failure(400, "Choose an available examination location.");
        if (!["Tamil", "English"].includes(data.preferredMedium))
          failure(400, "Select Tamil or English as your preferred medium.");
        if (
          !Array.isArray(data.entries) ||
          !data.entries.length ||
          data.entries.length > 80
        )
          failure(400, "Select 1–80 examinations.");
        db.exec("BEGIN IMMEDIATE");
        try {
          const seen = new Set(),
            counts = {};
          for (const item of data.entries) {
            if (
              !subjectDirectory().some(
                (s) => s.id === item.subjectId && s.active,
              )
            )
              failure(400, "Select a valid subject.");
            const t = teacherRecords.find(
              (t) =>
                t.id === item.teacherId &&
                (!t.subjects.length || t.subjects.includes(item.subjectId)),
            );
            if (!t) failure(400, "Select a qualified teacher.");
            const eligible = eligibility(student, item.subjectId).find(
              (g) => g.grade === item.grade,
            );
            if (!eligible?.eligible)
              failure(409, eligible?.reason || "Invalid grade.");
            const key = `${item.subjectId}/${item.grade}`;
            if (seen.has(key))
              failure(409, "You have already selected this subject and grade.");
            seen.add(key);
            counts[item.subjectId] = (counts[item.subjectId] || 0) + 1;
          }
          for (const [subjectId, count] of Object.entries(counts)) {
            if (
              count > 1 &&
              data.entries.some(
                (i) =>
                  i.subjectId === subjectId && gradeOrder.indexOf(i.grade) >= 7,
              )
            )
              failure(
                409,
                "After Grade 3, select only one next examination per subject.",
              );
            const teacherIds = new Set(
              data.entries
                .filter((i) => i.subjectId === subjectId)
                .map((i) => i.teacherId),
            );
            if (teacherIds.size > 1)
              failure(400, "Use one teacher for each subject.");
          }
          const year = new Date(now).getFullYear(),
            serial =
              Number(get("SELECT count(*) AS n FROM exam_applications").n) + 1,
            id = `APP-${year}-${String(serial).padStart(5, "0")}`;
          run(
            "INSERT INTO exam_applications VALUES(?,?,?,?,?,?,?,?,?)",
            id,
            student.student_id,
            student.firstName,
            student.lastName,
            data.preferredMedium,
            cfg.name,
            autoApprove ? "approved" : "pending",
            now,
            now,
          );
          for (const item of data.entries) {
            const t = teacherRecords.find((t) => t.id === item.teacherId);
            run(
              "INSERT INTO exam_items(id,application_id,subject_id,grade,teacher_id,school,status,reviewed,updated) VALUES(?,?,?,?,?,?,?,?,?)",
              crypto.randomUUID(),
              id,
              item.subjectId,
              item.grade,
              t.id,
              t.school,
              autoApprove ? "approved" : "pending",
              autoApprove ? now : null,
              now,
            );
          }
          if (data.preferredLocation) run("INSERT INTO exam_location_preferences VALUES(?,?)", id, data.preferredLocation);
          audit(state.user.id, "application-submitted", id);
          db.exec("COMMIT");
          learning.setMedium(student.student_id, data.preferredMedium);
          const saved = application(
            get("SELECT * FROM exam_applications WHERE id=?", id),
          );
          const pdf = await applicationPdf(saved);
          run("INSERT INTO exam_documents VALUES(?,?,?)", id, pdf, clock());
          reply(201, { application: saved });
        } catch (e) {
          try {
            db.exec("ROLLBACK");
          } catch {}
          throw e;
        }
        return true;
      }
      const itemMatch = route.match(/^items\/([^/]+)$/);
      if (itemMatch && req.method === "PATCH") {
        requireRole("admin", "teacher");
        const item = get("SELECT * FROM exam_items WHERE id=?", itemMatch[1]);
        if (!item) failure(404, "Application item not found.");
        if (role === "teacher" && item.teacher_id !== state.user.id)
          failure(403, "This application item is assigned to another teacher.");
        if (data.teacherId) {
          requireRole("admin");
          const t = teacherRecords.find(
            (t) =>
              t.id === data.teacherId &&
              (!t.subjects.length || t.subjects.includes(item.subject_id)),
          );
          if (!t) failure(400, "Select a qualified teacher.");
          run(
            "UPDATE exam_items SET teacher_id=?,school=?,status='pending',reviewed=NULL,review_note='',updated=? WHERE id=?",
            t.id,
            t.school,
            clock(),
            item.id,
          );
          audit(state.user.id, "item-rerouted", item.id);
        } else {
          if (
            !["approved", "rejected", "changes-required"].includes(data.status)
          )
            failure(400, "Select an approval decision.");
          if (data.status !== "approved" && !String(data.note || "").trim())
            failure(400, "Explain the rejection or required changes.");
          run(
            "UPDATE exam_items SET status=?,review_note=?,reviewed=?,updated=? WHERE id=?",
            data.status,
            String(data.note || "")
              .trim()
              .slice(0, 1000),
            clock(),
            clock(),
            item.id,
          );
          audit(state.user.id, "item-" + data.status, item.id);
        }
        recompute(item.application_id);
        reply(200, {
          application: application(
            get(
              "SELECT * FROM exam_applications WHERE id=?",
              item.application_id,
            ),
            role === "teacher" ? state.user.id : null,
          ),
        });
        return true;
      }
      if ((route === "ceremony-pass" || route === "ceremony/verify") && req.method === "GET") {
        const studentId = url.searchParams.get("studentId");
        const tokenFor = id => crypto.createHmac("sha256",value("admission_qr_secret")).update("ceremony:"+id).digest("hex");
        let student;
        if(route === "ceremony-pass") student=studentFor(studentId);
        else {
          const token=url.searchParams.get("token") || "";
          if(!studentId || !/^[a-f0-9]{64}$/.test(token) || !crypto.timingSafeEqual(Buffer.from(token),Buffer.from(tokenFor(studentId)))) failure(403,"Invalid ceremony pass.");
          student=students().find(s=>s.student_id===studentId);
          if(!student || student.registrationStatus!=='approved') failure(403,"This ceremony pass is not valid.");
        }
        const pass={passId:"CER-"+student.student_id.replaceAll('/','-'),studentId:student.student_id,studentName:student.name || `${student.firstName} ${student.lastName}`,type:"Student Entry Pass",status:"Valid",venue:"To be confirmed by admin",date:"To be confirmed",time:"To be confirmed"};
        const adminData=value('admin_portal_state',{}),attendance=adminData.attendance?.[student.student_id],ceremony=adminData.ceremonies?.find(c=>c.id===attendance?.sessionId);
        if(ceremony){pass.venue=adminData.venues?.find(v=>v.id===ceremony.venueId)?.name||pass.venue;pass.date=ceremony.date;pass.time=ceremony.start+' - '+ceremony.end;pass.seat=attendance.seat;pass.attendance=attendance.status;}
        if(route==='ceremony-pass') {
          pass.url=`${config.PUBLIC_APP_URL || config.APP_URL || 'http://127.0.0.1:5174'}/ceremony/pass?studentId=${encodeURIComponent(student.student_id)}&token=${tokenFor(student.student_id)}`;
          pass.qrImage=await QRCode.toDataURL(pass.url,{width:600,margin:4,errorCorrectionLevel:'M'});
        }
        reply(200,{pass});return true;
      }
      if (route === "examiner-candidates" && req.method === "GET") {
        if (!autoApprove) requireRole("examiner","admin");
        const id=String(url.searchParams.get('indexNumber')||'').trim();
        const rows=all("SELECT * FROM exam_applications WHERE student_id=? AND status='approved'",id);
        reply(200,{records:rows.flatMap(row=>{const a=application(row);return a.entries.map(e=>({applicationId:a.id,indexNumber:a.studentId,name:a.candidateName,subject:e.subject,level:e.grade,medium:a.preferredMedium,location:a.preferredLocation,teacher:e.teacher}));})});return true;
      }
      if (route === "examiner-marks") {
        if (req.method !== "GET") requireRole("examiner");
        if (!autoApprove) requireRole("examiner", "admin");
        const appId = req.method === "GET" ? url.searchParams.get("applicationId") : data.applicationId;
        const appRow = get("SELECT * FROM exam_applications WHERE id=? AND status='approved'", appId);
        if (!appRow) failure(404, "Approved application not found.");
        const entries = application(appRow).entries;
        if (req.method === "POST") {
          const entry = entries.find(e=>e.subject===data.subject && e.grade===data.level);
          if (!entry || !['theory','practical'].includes(data.component) || !/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(String(data.mark)) || Number(data.mark)>100) failure(400,"Choose a valid examination and mark from 0 to 100.");
          run("INSERT INTO examiner_component_marks(item_id,updated) VALUES(?,?) ON CONFLICT(item_id) DO NOTHING",entry.id,clock());
          run(`UPDATE examiner_component_marks SET ${data.component}=?,updated=? WHERE item_id=?`,Number(data.mark),clock(),entry.id);
          audit(state.user?.id || 'preview-examiner',`examiner-${data.component}-mark`,entry.id);
        } else if (req.method !== "GET") failure(405,"Method not allowed.");
        const marks={};for(const entry of entries){const m=get("SELECT * FROM examiner_component_marks WHERE item_id=?",entry.id);if(m)marks[JSON.stringify([appId,appRow.student_id,entry.subject,entry.grade])] = {theory:m.theory===null?undefined:String(m.theory),practical:m.practical===null?undefined:String(m.practical)};}
        reply(200,{marks});return true;
      }
      const pdfMatch = route.match(/^applications\/([^/]+)\/(pdf|admission|marking-sheet)$/);
      if (pdfMatch && req.method === "GET") {
        const row = get(
          "SELECT * FROM exam_applications WHERE id=?",
          pdfMatch[1],
        );
        if (!row) failure(404, "Application not found.");
        const isSheet = pdfMatch[2] === "marking-sheet";
        if (isSheet) {
          const token = url.searchParams.get("token") || "";
          if (!/^[a-f0-9]{64}$/.test(token) || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(admissionToken(row.id)))) failure(403, "Invalid admission QR code.");
          if (row.status !== "approved") failure(403, "Admission is not approved.");
          if (url.searchParams.get("format") === "json") {
            const app=application(row),payload=admissionPayload(app);
            payload.viewOnly=req.headers['x-qr-view-only']==='1';
            payload.canEdit=role==='examiner'&&!payload.viewOnly;
            payload.examinations=payload.examinations.map((e,i)=>{const m=get("SELECT theory,practical FROM examiner_component_marks WHERE item_id=?",app.entries[i].id)||{};return {...e,theory:m.theory??null,practical:m.practical??null,final:m.theory!=null&&m.practical!=null?Math.round((m.theory+m.practical)*50)/100:null};});
            reply(200,payload);return true;
          }
        } else if (role === "admin") {
        } else if (role === "teacher")
          failure(403, "Teachers view only their assigned items.");
        else if (studentFor(row.student_id).student_id !== row.student_id)
          failure(403, "Not your application.");
        if (pdfMatch[2] === "admission" && row.status !== "approved")
          failure(
            403,
            "All teacher approvals are required before examination access.",
          );
        const isAdmission = pdfMatch[2] === "admission";
        const app = application(row);
        app.qrUrl = `${config.PUBLIC_APP_URL || config.APP_URL || "http://127.0.0.1:5174"}/examiner/admission?applicationId=${encodeURIComponent(row.id)}&token=${admissionToken(row.id)}`;
        const pdf = await (isAdmission ? admissionPdf : applicationPdf)({...app, ...(isSheet ? {markingSheet:true, documentTitle:"Student Examination Mark Sheet"} : {})});
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${row.id}-${isSheet ? "marking-sheet" : isAdmission ? "admission-card" : "application"}.pdf"`,
          "Content-Length": pdf.length,
          "X-Frame-Options": "SAMEORIGIN",
        });
        res.end(pdf);
        return true;
      }
      failure(404, "Portal endpoint not found.");
    } catch (e) {
      reply(e.status || 400, { error: e.message });
    }
    return true;
  };
}
