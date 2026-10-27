import crypto from "node:crypto";
import { gradeOrder, practiceGrades } from "../src/student/rules.js";
import { subjects as initialSubjects } from "../src/student/data/studentData.js";
import { learningSeeds, questionText } from "./learning-seeds.mjs";
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const opaque = () => crypto.randomBytes(32).toString("hex");
export function createLearning(
  db,
  { clock, config, audit, failure, value, put, students },
) {
  const get = (q, ...a) => db.prepare(q).get(...a),
    all = (q, ...a) => db.prepare(q).all(...a),
    run = (q, ...a) => db.prepare(q).run(...a);
  db.exec(`CREATE TABLE IF NOT EXISTS learning_subjects(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,introduction TEXT NOT NULL,image TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,updated INTEGER NOT NULL,updated_by TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS learning_questions(id TEXT PRIMARY KEY,subject_id TEXT NOT NULL REFERENCES learning_subjects(id),grade TEXT NOT NULL,english TEXT,tamil TEXT,answer_index INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS learning_preferences(student_id TEXT PRIMARY KEY,medium TEXT NOT NULL,source TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS learning_stages(student_id TEXT NOT NULL,subject_id TEXT NOT NULL REFERENCES learning_subjects(id),current_grade TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(student_id,subject_id));
 CREATE TABLE IF NOT EXISTS practice_attempts(id INTEGER PRIMARY KEY,student_id TEXT NOT NULL,question_id TEXT NOT NULL REFERENCES learning_questions(id),subject_id TEXT NOT NULL,grade TEXT NOT NULL,medium TEXT NOT NULL,selected_index INTEGER NOT NULL,correct INTEGER NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS practice_student ON practice_attempts(student_id,subject_id,grade);
 CREATE TABLE IF NOT EXISTS learning_results(id TEXT PRIMARY KEY,student_id TEXT NOT NULL,subject_id TEXT NOT NULL REFERENCES learning_subjects(id),grade TEXT NOT NULL,score REAL NOT NULL,status TEXT NOT NULL,feedback TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS password_resets(token_hash TEXT PRIMARY KEY,session_token TEXT NOT NULL,account_id TEXT,account_role TEXT NOT NULL,code_hash TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,grant_hash TEXT,consumed INTEGER NOT NULL DEFAULT 0);`);
  // Update the display spelling while retaining subject IDs and linked records.
  run("UPDATE learning_subjects SET name=?,updated=?,updated_by=? WHERE id=? AND name=?", "Miruthangam", clock(), "system", "mridangam", "Mridangam");
  run("UPDATE learning_subjects SET introduction=replace(replace(introduction,'Mridangam','Miruthangam'),'mridangam','miruthangam') WHERE id='mridangam'");
  run("UPDATE learning_questions SET english=replace(replace(english,'Mridangam','Miruthangam'),'mridangam','miruthangam') WHERE subject_id='mridangam'");
  const gradeSQL =
    "CASE grade " +
    gradeOrder.map((g, i) => `WHEN '${g}' THEN ${i}`).join(" ") +
    " END";
  for (const subject of initialSubjects) {
    if (!get("SELECT 1 FROM learning_subjects WHERE id=?", subject.id)) {
      run(
        "INSERT INTO learning_subjects VALUES(?,?,?,?,1,?,?)",
        subject.id,
        subject.name,
        learningSeeds[subject.id].introduction,
        subject.image,
        clock(),
        "system",
      );
      for (const grade of gradeOrder) {
        learningSeeds[subject.id].questions.forEach((q, index) =>
          run(
            "INSERT INTO learning_questions VALUES(?,?,?,?,?,?,1,?)",
            `${subject.id}-${grade.replaceAll(" ", "-").toLowerCase()}-${index + 1}`,
            subject.id,
            grade,
            JSON.stringify(questionText(q, "English")),
            JSON.stringify(questionText(q, "Tamil")),
            q[4],
            clock(),
          ),
        );
      }
    }
  }
  if (!get("SELECT 1 FROM portal_values WHERE key=?", "about_content"))
    put("about_content", {
      title: "About Ensemble",
      content:
        value("exam_config")?.about ||
        "We connect musical learning with meaningful achievement.",
      image: "/subjects/piano.svg",
      sections: [
        {
          title: "Who We Are",
          content:
            "Ensemble supports students, families and teachers with a clear path through music education and examinations.",
        },
        {
          title: "Our Mission",
          content:
            "To encourage thoughtful practice, celebrate progress and make learning accessible in Tamil and English.",
        },
        {
          title: "Our Examination System",
          content:
            "A permanent student account connects examinations, results and subject progress across academic years.",
        },
      ],
      updatedAt: new Date(clock()).toISOString(),
      updatedBy: "system",
    });
  const directory = (activeOnly = false) =>
    all(
      "SELECT * FROM learning_subjects " +
        (activeOnly ? "WHERE active=1 " : "") +
        "ORDER BY rowid",
    ).map((s) => ({ ...s, active: !!s.active }));
  function setMedium(studentId, medium, source = "application") {
    run(
      "INSERT INTO learning_preferences VALUES(?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET medium=excluded.medium,source=excluded.source,updated=excluded.updated",
      studentId,
      medium,
      source,
      clock(),
    );
  }
  function context(student, subjectId) {
    const subject = get(
      "SELECT * FROM learning_subjects WHERE id=? AND active=1",
      subjectId,
    );
    if (!subject) failure(404, "This subject is not currently available.");
    const completed = all(
      `SELECT grade FROM exam_progress WHERE student_id=? AND subject_id=? AND passed=1 ORDER BY ${gradeSQL}`,
      student.student_id,
      subjectId,
    ).map((r) => r.grade);
    const stage = get(
      "SELECT current_grade FROM learning_stages WHERE student_id=? AND subject_id=?",
      student.student_id,
      subjectId,
    )?.current_grade;
    const entries = all(
      `SELECT i.grade,a.medium,a.created FROM exam_items i JOIN exam_applications a ON a.id=i.application_id WHERE a.student_id=? AND i.subject_id=? AND i.status IN ('pending','approved') ORDER BY a.created DESC`,
      student.student_id,
      subjectId,
    );
    const available = practiceGrades(
      { currentGrade: stage, completedGrades: completed },
      entries.map((e) => e.grade),
    );
    const currentGrade = available.at(-1);
    const preference = get(
      "SELECT * FROM learning_preferences WHERE student_id=?",
      student.student_id,
    );
    const medium =
      preference?.source === "manual"
        ? preference.medium
        : entries[0]?.medium || preference?.medium || "English";
    const stats = get(
      "SELECT count(*) attempts,sum(correct) correct,max(created) last_practised FROM practice_attempts WHERE student_id=? AND subject_id=?",
      student.student_id,
      subjectId,
    );
    return {
      subject: { ...subject, active: true },
      currentGrade,
      completedGrades: completed,
      availableGrades: available,
      grades: gradeOrder.map((g) => ({
        grade: g,
        availability: !available.includes(g)
          ? "locked"
          : g === currentGrade
            ? "current"
            : "previous",
        completed: completed.includes(g),
      })),
      medium,
      stats: {
        attempts: stats.attempts,
        correct: stats.correct || 0,
        lastPractised: stats.last_practised
          ? new Date(stats.last_practised).toISOString()
          : null,
      },
    };
  }
  const resultsFor = (id) =>
    all(
      "SELECT r.*,s.name subject FROM learning_results r JOIN learning_subjects s ON s.id=r.subject_id WHERE student_id=? AND status=? ORDER BY created DESC",
      id,
      "published",
    ).map((r) => ({
      ...r,
      date: new Date(r.created).toISOString().slice(0, 10),
      classification:
        r.score >= 90
          ? "Distinction"
          : r.score >= 75
            ? "Merit"
            : r.score >= 60
              ? "Pass"
              : "Review",
    }));
  function summaries(student) {
    return directory(true).map((s) => context(student, s.id));
  }
  function image(value) {
    if (
      typeof value !== "string" ||
      value.length > 2000 ||
      !(
        (value.startsWith("/") && !value.startsWith("//")) ||
        value.startsWith("https://")
      )
    )
      failure(400, "Use a local image path or HTTPS image URL.");
    return value;
  }
  function translation(t) {
    if (t == null || t.question?.trim() === "") return null;
    if (
      typeof t.question !== "string" ||
      !Array.isArray(t.options) ||
      t.options.length < 2 ||
      t.options.length > 6 ||
      t.options.some((o) => typeof o !== "string" || !o.trim()) ||
      t.question.length > 2000
    )
      failure(
        400,
        "Each translation needs a question and 2–6 nonempty options.",
      );
    return {
      question: t.question.trim(),
      options: t.options.map((o) => o.trim().slice(0, 500)),
      instructions: String(t.instructions || "")
        .trim()
        .slice(0, 1000),
      explanation: String(t.explanation || "")
        .trim()
        .slice(0, 2000),
    };
  }
  async function handle({
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
  }) {
    if (route === "subjects" && req.method === "GET") {
      if (url.searchParams.get("all") === "1") requireRole("admin");
      reply(200, {
        subjects: directory(url.searchParams.get("all") !== "1"),
        gradeOrder,
      });
      return true;
    }
    if (route === "about" && req.method === "GET") {
      reply(200, value("about_content"));
      return true;
    }
    if (route === "about" && req.method === "PUT") {
      requireRole("admin");
      if (
        !String(data.title || "").trim() ||
        !String(data.content || "").trim()
      )
        failure(400, "About title and main content are required.");
      if (!Array.isArray(data.sections) || data.sections.length > 8)
        failure(400, "Use up to eight About sections.");
      const saved = {
        title: String(data.title).trim().slice(0, 200),
        content: String(data.content).trim().slice(0, 10000),
        image: image(data.image),
        sections: data.sections.map((s) => ({
          title: String(s.title || "").slice(0, 200),
          content: String(s.content || "").slice(0, 5000),
        })),
        updatedAt: new Date(clock()).toISOString(),
        updatedBy: state.user.id,
      };
      put("about_content", saved);
      put("exam_config", { ...value("exam_config"), about: saved.content });
      audit(state.user.id, "about-updated", "about");
      reply(200, saved);
      return true;
    }
    const subjectMatch = route.match(/^subjects\/([a-z0-9-]+)$/);
    if (
      (subjectMatch && req.method === "PUT") ||
      (route === "subjects" && req.method === "POST")
    ) {
      requireRole("admin");
      const id = subjectMatch?.[1] || data.id;
      if (
        !/^[a-z0-9-]{2,80}$/.test(id || "") ||
        !String(data.name || "").trim() ||
        !String(data.introduction || "").trim()
      )
        failure(400, "Provide a unique subject ID, name and introduction.");
      if (
        subjectMatch &&
        !get("SELECT 1 FROM learning_subjects WHERE id=?", id)
      )
        failure(404, "Subject not found.");
      if (
        !subjectMatch &&
        get("SELECT 1 FROM learning_subjects WHERE id=?", id)
      )
        failure(409, "This subject ID already exists.");
      run(
        "INSERT INTO learning_subjects VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,introduction=excluded.introduction,image=excluded.image,active=excluded.active,updated=excluded.updated,updated_by=excluded.updated_by",
        id,
        String(data.name).trim().slice(0, 100),
        String(data.introduction).trim().slice(0, 5000),
        image(data.image),
        data.active === false ? 0 : 1,
        clock(),
        state.user.id,
      );
      audit(state.user.id, "subject-updated", id);
      reply(subjectMatch ? 200 : 201, { subjects: directory() });
      return true;
    }
    if (route === "learning" && req.method === "GET") {
      const student = studentFor(url.searchParams.get("studentId"));
      reply(200, {
        subjects: summaries(student),
        gradeOrder,
        preferredMedium:
          get(
            "SELECT medium FROM learning_preferences WHERE student_id=?",
            student.student_id,
          )?.medium || "English",
      });
      return true;
    }
    if (route === "preferences" && req.method === "PUT") {
      const student = studentFor(data.studentId);
      if (!["English", "Tamil"].includes(data.medium))
        failure(400, "Choose English or Tamil.");
      setMedium(student.student_id, data.medium, "manual");
      reply(200, { medium: data.medium });
      return true;
    }
    const learningMatch = route.match(/^learning\/([a-z0-9-]+)$/);
    if (learningMatch && req.method === "GET") {
      reply(
        200,
        context(
          studentFor(url.searchParams.get("studentId")),
          learningMatch[1],
        ),
      );
      return true;
    }
    if (route === "learning-stage" && req.method === "PUT") {
      requireRole("admin");
      if (
        !students().some((s) => s.student_id === data.studentId) ||
        !get("SELECT 1 FROM learning_subjects WHERE id=?", data.subjectId) ||
        !gradeOrder.includes(data.grade)
      )
        failure(
          400,
          "Select a valid student, subject and current learning stage.",
        );
      run(
        "INSERT INTO learning_stages VALUES(?,?,?,?) ON CONFLICT(student_id,subject_id) DO UPDATE SET current_grade=excluded.current_grade,updated=excluded.updated",
        data.studentId,
        data.subjectId,
        data.grade,
        clock(),
      );
      audit(
        state.user.id,
        "learning-stage-updated",
        data.studentId + "/" + data.subjectId,
      );
      reply(200, { saved: true });
      return true;
    }
    const practiceMatch = route.match(/^practice\/([a-z0-9-]+)$/);
    if (practiceMatch && req.method === "GET") {
      const student = studentFor(url.searchParams.get("studentId")),
        ctx = context(student, practiceMatch[1]),
        grade = url.searchParams.get("grade") || ctx.currentGrade;
      if (!ctx.availableGrades.includes(grade))
        failure(
          403,
          "This question session is above your permitted learning stage.",
        );
      const rows = all(
        "SELECT * FROM learning_questions WHERE subject_id=? AND grade=? AND active=1 ORDER BY rowid",
        practiceMatch[1],
        grade,
      );
      const field = ctx.medium === "Tamil" ? "tamil" : "english";
      const questions = rows
        .filter((q) => q[field])
        .map((q) => ({
          id: q.id,
          subjectId: q.subject_id,
          grade: q.grade,
          ...JSON.parse(q[field]),
        }));
      const attempts = all(
        "SELECT question_id,count(*) attempts,sum(correct) correct FROM practice_attempts WHERE student_id=? AND subject_id=? AND grade=? GROUP BY question_id",
        student.student_id,
        practiceMatch[1],
        grade,
      );
      reply(200, {
        grade,
        medium: ctx.medium,
        questions,
        attempts,
        unavailableCount: rows.filter((q) => !q[field]).length,
      });
      return true;
    }
    if (route === "practice-attempts" && req.method === "POST") {
      const student = studentFor(data.studentId),
        question = get(
          "SELECT * FROM learning_questions WHERE id=? AND active=1",
          data.questionId,
        );
      if (!question) failure(404, "Question not available.");
      const ctx = context(student, question.subject_id);
      if (!ctx.availableGrades.includes(question.grade))
        failure(403, "This question session is locked.");
      const text = question[ctx.medium === "Tamil" ? "tamil" : "english"];
      if (!text)
        failure(
          409,
          "This question is not translated in your selected medium.",
        );
      const content = JSON.parse(text);
      if (
        !Number.isInteger(data.selectedIndex) ||
        data.selectedIndex < 0 ||
        data.selectedIndex >= content.options.length
      )
        failure(400, "Choose a valid answer.");
      const correct = data.selectedIndex === question.answer_index;
      run(
        "INSERT INTO practice_attempts(student_id,question_id,subject_id,grade,medium,selected_index,correct,created) VALUES(?,?,?,?,?,?,?,?)",
        student.student_id,
        question.id,
        question.subject_id,
        question.grade,
        ctx.medium,
        data.selectedIndex,
        correct ? 1 : 0,
        clock(),
      );
      reply(201, {
        correct,
        correctAnswer: content.options[question.answer_index],
        explanation: content.explanation,
        stats: context(student, question.subject_id).stats,
      });
      return true;
    }
    if (route === "questions" && req.method === "GET") {
      requireRole("admin");
      let rows = all(
        `SELECT * FROM learning_questions ORDER BY subject_id,${gradeSQL},rowid`,
      );
      if (url.searchParams.get("subjectId"))
        rows = rows.filter(
          (q) => q.subject_id === url.searchParams.get("subjectId"),
        );
      reply(200, {
        questions: rows.map((q) => ({
          ...q,
          english: q.english ? JSON.parse(q.english) : null,
          tamil: q.tamil ? JSON.parse(q.tamil) : null,
          active: !!q.active,
        })),
        gradeOrder,
      });
      return true;
    }
    const qMatch = route.match(/^questions\/([^/]+)$/);
    if (
      (qMatch && req.method === "PUT") ||
      (route === "questions" && req.method === "POST")
    ) {
      requireRole("admin");
      const id = qMatch?.[1] || crypto.randomUUID();
      if (qMatch && !get("SELECT 1 FROM learning_questions WHERE id=?", id))
        failure(404, "Question not found.");
      if (
        !get("SELECT 1 FROM learning_subjects WHERE id=?", data.subjectId) ||
        !gradeOrder.includes(data.grade)
      )
        failure(400, "Select a valid subject and grade.");
      const english = translation(data.english),
        tamil = translation(data.tamil);
      if (!english && !tamil)
        failure(400, "Provide at least one complete language version.");
      if (
        !Number.isInteger(data.answerIndex) ||
        data.answerIndex < 0 ||
        [english, tamil]
          .filter(Boolean)
          .some((t) => data.answerIndex >= t.options.length) ||
        (english && tamil && english.options.length !== tamil.options.length)
      )
        failure(
          400,
          "Match the answer options and select a valid correct answer.",
        );
      run(
        "INSERT INTO learning_questions VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,grade=excluded.grade,english=excluded.english,tamil=excluded.tamil,answer_index=excluded.answer_index,active=excluded.active,updated=excluded.updated",
        id,
        data.subjectId,
        data.grade,
        english ? JSON.stringify(english) : null,
        tamil ? JSON.stringify(tamil) : null,
        data.answerIndex,
        data.active === false ? 0 : 1,
        clock(),
      );
      audit(state.user.id, "question-updated", id);
      reply(qMatch ? 200 : 201, { id });
      return true;
    }
    if (route === "results" && req.method === "POST") {
      requireRole("admin");
      if (
        !students().some((s) => s.student_id === data.studentId) ||
        !get("SELECT 1 FROM learning_subjects WHERE id=?", data.subjectId) ||
        !gradeOrder.includes(data.grade) ||
        typeof data.score !== "number" ||
        !Number.isFinite(data.score) ||
        data.score < 0 ||
        data.score > 100 ||
        !["published", "draft"].includes(data.status)
      )
        failure(
          400,
          "Provide a valid student, subject, grade, score (0–100) and publication status.",
        );
      const id = crypto.randomUUID();
      run(
        "INSERT INTO learning_results VALUES(?,?,?,?,?,?,?,?,?)",
        id,
        data.studentId,
        data.subjectId,
        data.grade,
        data.score,
        data.status,
        String(data.feedback || "").slice(0, 5000),
        clock(),
        clock(),
      );
      if (data.status === "published")
        run(
          `INSERT INTO exam_progress VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,subject_id,grade) DO UPDATE SET passed=excluded.passed,result_status=excluded.result_status,updated=excluded.updated`,
          data.studentId,
          data.subjectId,
          data.grade,
          data.score >= 60 ? 1 : 0,
          0,
          data.score >= 60 ? "passed" : "failed",
          clock(),
        );
      audit(state.user.id, "result-recorded", id);
      reply(201, {
        result: resultsFor(data.studentId).find((r) => r.id === id) || {
          id,
          status: "draft",
        },
      });
      return true;
    }
    const approvalMatch = route.match(/^students\/([^/]+)\/approval$/);
    if (approvalMatch && req.method === "PATCH") {
      requireRole("admin");
      if (!["pending", "approved", "rejected"].includes(data.status))
        failure(400, "Choose an approval status.");
      const records = students(),
        student = records.find(
          (s) => s.student_id === decodeURIComponent(approvalMatch[1]),
        );
      if (!student) failure(404, "Student not found.");
      student.registrationStatus = data.status;
      put("musicDemoAccounts", records);
      audit(state.user.id, "student-" + data.status, student.student_id);
      reply(200, {
        studentId: student.student_id,
        registrationStatus: data.status,
      });
      return true;
    }
    // Development-only reset challenge, persisted and bound to the initiating session.
    if (route.startsWith("recovery/")) {
      if (config.NODE_ENV === "production")
        failure(
          503,
          "Configure real recovery delivery before enabling production password resets.",
        );
      if (req.method !== "POST") failure(405, "Method not allowed.");
      limit("recovery:" + req.socket.remoteAddress, 20, 900000);
      if (route === "recovery/request") {
        const role = data.role === "parent" ? "parent" : "student",
          collection =
            role === "parent" ? value("musicDemoParents", []) : students(),
          identifier = String(data.identifier || "")
            .trim()
            .toLowerCase();
        if (!identifier)
          failure(400, "Enter your registered email or Student ID.");
        const matches = collection.filter(
          (a) =>
            !a.parentId &&
            a.password &&
            (a.student_id?.toLowerCase() === identifier ||
              a.email?.toLowerCase() === identifier),
        );
        const account = matches.length === 1 ? matches[0] : null;
        const token = opaque();
        run(
          "INSERT INTO password_resets(token_hash,session_token,account_id,account_role,code_hash,expires) VALUES(?,?,?,?,?,?)",
          digest(token),
          session.token,
          account?.id || null,
          role,
          digest(token + ":123456"),
          clock() + 900000,
        );
        reply(200, {
          challenge: token,
          message:
            "If a matching account exists, verify its recovery code. Use a Student ID if an email is shared.",
        });
        return true;
      }
      const reset = get(
        "SELECT * FROM password_resets WHERE token_hash=? AND session_token=?",
        digest(String(data.challenge || "")),
        session.token,
      );
      if (!reset || reset.consumed || reset.expires <= clock())
        failure(410, "Recovery session expired. Request a new code.");
      if (reset.attempts >= 5)
        failure(429, "Too many incorrect codes. Request a new recovery code.");
      if (route === "recovery/verify") {
        run(
          "UPDATE password_resets SET attempts=attempts+1 WHERE token_hash=?",
          reset.token_hash,
        );
        if (
          !reset.account_id ||
          typeof data.code !== "string" ||
          !/^\d{6}$/.test(data.code) ||
          digest(String(data.challenge) + ":" + data.code) !== reset.code_hash
        )
          failure(400, "Invalid verification code.");
        const grant = opaque();
        run(
          "UPDATE password_resets SET grant_hash=? WHERE token_hash=?",
          digest(grant),
          reset.token_hash,
        );
        reply(200, { grant });
        return true;
      }
      if (route === "recovery/reset") {
        if (
          !reset.grant_hash ||
          digest(String(data.grant || "")) !== reset.grant_hash
        )
          failure(
            403,
            "Verify your recovery code before resetting the password.",
          );
        if (
          typeof data.password !== "string" ||
          data.password.length < 8 ||
          data.password.length > 128 ||
          !/[A-Za-z]/.test(data.password) ||
          !/[0-9]/.test(data.password) ||
          data.password !== data.confirmPassword
        )
          failure(
            400,
            "Use 8–128 characters with letters and numbers, and matching password confirmation.",
          );
        const key =
            reset.account_role === "parent"
              ? "musicDemoParents"
              : "musicDemoAccounts",
          records = value(key, []),
          account = records.find((a) => a.id === reset.account_id);
        if (!account) failure(404, "Account unavailable.");
        const salt = opaque();
        account.password =
          "scrypt:" +
          salt +
          ":" +
          crypto.scryptSync(data.password, salt, 32).toString("hex");
        db.exec("BEGIN IMMEDIATE");
        try {
          put(key, records);
          run(
            "UPDATE password_resets SET consumed=1 WHERE account_id=?",
            account.id,
          );
          for (const s of all("SELECT token,state FROM portal_sessions")) {
            const saved = JSON.parse(s.state);
            if (
              saved.user?.id === account.id ||
              saved.pending?.id === account.id
            )
              run(
                "UPDATE portal_sessions SET state='{}' WHERE token=?",
                s.token,
              );
          }
          audit(account.id, "password-reset", account.id);
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        sessionStorage.setItem(
          "",
          JSON.stringify({ user: null, pending: null }),
        );
        reply(200, {
          message:
            "Password reset successfully. Sign in with your new password.",
        });
        return true;
      }
      failure(404, "Recovery endpoint not found.");
    }
    return false;
  }
  return {
    handle,
    directory,
    context,
    summaries,
    resultsFor,
    setMedium,
    preferredMedium: (id) =>
      get("SELECT medium FROM learning_preferences WHERE student_id=?", id)
        ?.medium || "English",
  };
}
