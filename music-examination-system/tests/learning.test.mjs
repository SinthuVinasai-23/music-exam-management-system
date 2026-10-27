import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAuthServer } from "../auth-server/server.mjs";
import { gradeOrder } from "../src/student/rules.js";
const dir = mkdtempSync(path.join(tmpdir(), "ensemble-learning-"));
let service,
  base,
  now = Date.parse("2026-10-06T12:00:00Z");
async function start(config = {}) {
  service = await createAuthServer({
    dataDir: dir,
    clock: () => now,
    config: { APP_URL: "http://127.0.0.1:5175", ...config },
    sendEmail: async () => {},
  });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + service.server.address().port;
}
const close = () => new Promise((r) => service.server.close(r));
function client() {
  let cookie = "",
    csrf = "";
  return async (
    route,
    data,
    method = data === undefined ? "GET" : "POST",
    status = 200,
  ) => {
    const res = await fetch(base + "/api/portal/" + route, {
      method,
      headers: {
        cookie,
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (res.headers.get("set-cookie"))
      cookie = res.headers.get("set-cookie").split(";")[0];
    const result = await res.json();
    if (result.csrf) csrf = result.csrf;
    assert.equal(res.status, status, JSON.stringify(result));
    return result;
  };
}
const registration = (name, email) => ({
  role: "student",
  firstName: name,
  lastName: "Learner",
  dateOfBirth: "2000-02-10",
  phone: "0771234567",
  email,
  password: "Password2026",
  confirmPassword: "Password2026",
});
await test("permanent bilingual learning and verified recovery", async (t) => {
  try {
    await start();
    const student = client(),
      admin = client(),
      other = client();
    for (const c of [student, admin, other]) await c("session");
    await admin("staff-login", {
      email: "admin@ensemble.local",
      password: "EnsembleAdmin2026",
    });
    await student(
      "register",
      registration("Practice", "practice@example.com"),
      "POST",
      201,
    );
    const original = (await student("verify", { code: "123456" })).user,
      id = original.student_id;
    assert.equal(original.registrationStatus, "approved");
    await t.test("canonical order and every active subject", async () => {
      const content = await student("learning");
      assert.deepEqual(content.gradeOrder, gradeOrder);
      assert.equal(content.subjects.length, 8);
      assert.ok(
        content.subjects.every(
          (s) =>
            s.subject.image &&
            s.subject.introduction &&
            s.currentGrade === "Level 1",
        ),
      );
      await student("questions", undefined, "GET", 403);
      await other("learning", undefined, "GET", 401);
    });
    await t.test(
      "current and previous grades allowed; future questions denied",
      async () => {
        await admin(
          "learning-stage",
          { studentId: id, subjectId: "piano", grade: "Grade 3" },
          "PUT",
        );
        const c = await student("learning/piano");
        assert.deepEqual(c.availableGrades, gradeOrder.slice(0, 7));
        for (const grade of c.availableGrades) {
          const bank = await student(
            "practice/piano?grade=" + encodeURIComponent(grade),
          );
          assert.equal(bank.questions.length, 2);
          assert.ok(
            bank.questions.every(
              (q) => !("answerIndex" in q) && !("answer_index" in q),
            ),
          );
        }
        await student("practice/piano?grade=Grade%204", undefined, "GET", 403);
        await student(
          "practice-attempts",
          { questionId: "piano-grade-4-1", selectedIndex: 0 },
          "POST",
          403,
        );
        const bank = await student("practice/piano?grade=Grade%203");
        await student(
          "practice-attempts",
          { questionId: bank.questions[0].id, selectedIndex: 0 },
          "POST",
          201,
        );
        assert.equal((await student("learning/piano")).stats.attempts, 1);
      },
    );
    await t.test(
      "explicit Tamil content and missing-translation handling",
      async () => {
        await student("preferences", { medium: "Tamil" }, "PUT");
        const bank = await student("practice/piano?grade=Grade%201");
        assert.equal(bank.medium, "Tamil");
        assert.ok(
          bank.questions.every(
            (q) =>
              /[\u0B80-\u0BFF]/.test(q.question) &&
              q.options.every((o) => /[\u0B80-\u0BFF]/.test(o)) &&
              !/[a-zA-Z]/.test(q.question + q.instructions),
          ),
        );
        const missing = await admin(
          "questions",
          {
            subjectId: "piano",
            grade: "Grade 1",
            english: {
              question: "English only",
              instructions: "Select one.",
              options: ["Yes", "No"],
              explanation: "Yes.",
            },
            tamil: null,
            answerIndex: 0,
            active: true,
          },
          "POST",
          201,
        );
        const after = await student("practice/piano?grade=Grade%201");
        assert.equal(after.unavailableCount, 1);
        assert.equal(after.questions.length, 2);
        await student(
          "practice-attempts",
          { questionId: missing.id, selectedIndex: 0 },
          "POST",
          409,
        );
      },
    );
    await t.test(
      "published results, applications and editable persistent content",
      async () => {
        await admin(
          "results",
          {
            studentId: id,
            subjectId: "piano",
            grade: "Grade 3",
            score: 92,
            status: "published",
            feedback: "Excellent preparation",
          },
          "POST",
          201,
        );
        await admin(
          "results",
          {
            studentId: id,
            subjectId: "violin",
            grade: "Grade 1",
            score: 80,
            status: "draft",
            feedback: "",
          },
          "POST",
          201,
        );
        assert.equal((await student("session")).user.results.length, 1);
        await student(
          "applications",
          {
            studentId: id,
            entries: [
              { subjectId: "piano", grade: "Grade 4", teacherId: "teacher-1" },
            ],
            preferredMedium: "Tamil",
          },
          "POST",
          201,
        );
        assert.equal((await student("learning/piano")).currentGrade, "Grade 4");
        const about = {
          title: "Music For Every Learner",
          content: "Permanent accounts and meaningful learning.",
          image: "/subjects/violin.svg",
          sections: [{ title: "Our Mission", content: "Accessible practice." }],
        };
        await admin("about", about, "PUT");
        assert.equal((await other("about")).title, about.title);
        const piano = (await admin("subjects?all=1")).subjects.find(
          (s) => s.id === "piano",
        );
        await admin(
          "subjects/piano",
          { ...piano, introduction: "Learn piano with focused practice." },
          "PUT",
        );
        assert.equal(
          (await student("learning/piano")).subject.introduction,
          "Learn piano with focused practice.",
        );
        await admin(
          "subjects/violin",
          {
            ...(await admin("subjects?all=1")).subjects.find(
              (s) => s.id === "violin",
            ),
            active: false,
          },
          "PUT",
        );
        assert.equal((await student("learning")).subjects.length, 7);
        await student("learning/violin", undefined, "GET", 404);
        await other("about", about, "PUT", 401);
      },
    );
    await t.test(
      "recovery requires verified session and changes existing account only",
      async () => {
        const recovery = client();
        await recovery("session");
        const { challenge } = await recovery("recovery/request", {
          identifier: id,
        });
        await recovery(
          "recovery/reset",
          {
            challenge,
            password: "NewPassword2026",
            confirmPassword: "NewPassword2026",
          },
          "POST",
          403,
        );
        await recovery(
          "recovery/verify",
          { challenge, code: "000000" },
          "POST",
          400,
        );
        await other(
          "recovery/verify",
          { challenge, code: "123456" },
          "POST",
          410,
        );
        const { grant } = await recovery("recovery/verify", {
          challenge,
          code: "123456",
        });
        await recovery("recovery/reset", {
          challenge,
          grant,
          password: "NewPassword2026",
          confirmPassword: "NewPassword2026",
        });
        await recovery(
          "recovery/reset",
          {
            challenge,
            grant,
            password: "Another2026",
            confirmPassword: "Another2026",
          },
          "POST",
          410,
        );
        await recovery(
          "login",
          { role: "student", email: id, password: "Password2026" },
          "POST",
          400,
        );
        const login = await recovery("login", {
          role: "student",
          email: id,
          password: "NewPassword2026",
        });
        assert.equal(login.user.student_id, id);
        assert.equal((await recovery("session")).user.results.length, 1);
        assert.equal((await recovery("applications")).applications.length, 1);
        assert.equal((await recovery("learning/piano")).stats.attempts, 1);
        assert.equal((await recovery("learning")).preferredMedium, "Tamil");
        assert.equal((await admin("students")).students.length, 1);
        await recovery(
          "recover",
          { identifier: id, password: "Shortcut2026" },
          "POST",
          404,
        );
      },
    );
    await t.test("recovery expiry and retry limit", async () => {
      const c = client();
      await c("session");
      let { challenge } = await c("recovery/request", { identifier: id });
      for (let i = 0; i < 5; i++)
        await c("recovery/verify", { challenge, code: "111111" }, "POST", 400);
      await c("recovery/verify", { challenge, code: "123456" }, "POST", 429);
      ({ challenge } = await c("recovery/request", { identifier: id }));
      now += 900001;
      await c("recovery/verify", { challenge, code: "123456" }, "POST", 410);
    });
    await t.test(
      "permanent identity and history after restart and another year",
      async () => {
        await close();
        now = Date.parse("2029-10-06T12:00:00Z");
        await start();
        const c = client();
        await c("session");
        const login = await c("login", {
          role: "student",
          email: id,
          password: "NewPassword2026",
        });
        assert.equal(login.user.student_id, id);
        assert.equal((await c("session")).user.results.length, 1);
        assert.equal((await c("applications")).applications.length, 1);
        assert.equal((await c("learning/piano")).stats.attempts, 1);
        assert.equal((await c("about")).title, "Music For Every Learner");
      },
    );
    await t.test(
      "future manual registration approval can be enabled",
      async () => {
        await close();
        await start({ REGISTRATION_APPROVAL_REQUIRED: "true" });
        const c = client(),
          a = client();
        await c("session");
        await a("session");
        await a("staff-login", {
          email: "admin@ensemble.local",
          password: "EnsembleAdmin2026",
        });
        await c(
          "register",
          registration("Future", "future@example.com"),
          "POST",
          201,
        );
        const user = (await c("verify", { code: "123456" })).user;
        assert.equal(user.registrationStatus, "pending");
        await c("learning", undefined, "GET", 403);
        await a(
          "students/" + encodeURIComponent(user.student_id) + "/approval",
          { status: "approved" },
          "PATCH",
        );
        assert.equal((await c("learning")).subjects.length, 7);
      },
    );
    await t.test(
      "parent recovery retains child identities and account ownership",
      async () => {
        const p = client();
        await p("session");
        await p(
          "register",
          {
            role: "parent",
            parent: {
              firstName: "Recovery",
              lastName: "Guardian",
              email: "guardian@example.com",
              phone: "0771234567",
              password: "Parent2026",
              confirmPassword: "Parent2026",
            },
            child: {
              firstName: "Young",
              lastName: "Learner",
              dateOfBirth: "2013-05-10",
            },
          },
          "POST",
          201,
        );
        await p("verify", { code: "123456" });
        const before = await p("session");
        const { challenge } = await p("recovery/request", {
          role: "parent",
          identifier: "guardian@example.com",
        });
        const { grant } = await p("recovery/verify", {
          challenge,
          code: "123456",
        });
        await p("recovery/reset", {
          challenge,
          grant,
          password: "NewParent2026",
          confirmPassword: "NewParent2026",
        });
        await p("login", {
          role: "parent",
          email: "guardian@example.com",
          password: "NewParent2026",
        });
        const after = await p("session");
        assert.equal(after.user.id, before.user.id);
        assert.deepEqual(
          after.children.map((c) => c.student_id),
          before.children.map((c) => c.student_id),
        );
      },
    );
  } finally {
    if (service?.server.listening) await close();
    rmSync(dir, { recursive: true, force: true });
  }
});
