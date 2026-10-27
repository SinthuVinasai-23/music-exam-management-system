import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAuthServer } from "../auth-server/server.mjs";
let now = Date.parse("2026-10-06T12:00:00Z"),
  service,
  base;
const dir = mkdtempSync(path.join(tmpdir(), "ensemble-exam-tests-"));
async function start(requireSyllabusClearance = "true") {
  service = await createAuthServer({
    dataDir: dir,
    clock: () => now,
    config: { APP_URL: "http://127.0.0.1:5175", REQUIRE_SYLLABUS_CLEARANCE: requireSyllabusClearance },
    sendEmail: async () => {},
  });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + service.server.address().port;
}
const close = () => new Promise((r) => service.server.close(r));
function client() {
  let cookie = "",
    csrf = "";
  return {
    async request(
      route,
      data,
      method = data === undefined ? "GET" : "POST",
      expected = 200,
    ) {
      const response = await fetch(base + "/api/portal/" + route, {
        method,
        headers: {
          cookie,
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      if (response.headers.get("set-cookie"))
        cookie = response.headers.get("set-cookie").split(";")[0];
      const result = response.headers
        .get("content-type")
        ?.includes("application/pdf")
        ? Buffer.from(await response.arrayBuffer())
        : await response.json();
      if (result.csrf) csrf = result.csrf;
      assert.equal(response.status, expected, JSON.stringify(result));
      return result;
    },
  };
}
const account = (firstName = "John", email = "john@example.com") => ({
  role: "student",
  firstName,
  lastName: "Smith",
  dateOfBirth: "2000-02-10",
  phone: "0771234567",
  email,
  password: "Password2026",
  confirmPassword: "Password2026",
});
const item = (
  subjectId = "piano",
  grade = "Grade 1",
  teacherId = "teacher-1",
) => ({ subjectId, grade, teacherId });
await test("persistent exam workflow", async (t) => {
  try {
    await start();
    const student = client(),
      admin = client(),
      teacher1 = client(),
      teacher2 = client(),
      stranger = client();
    for (const c of [student, admin, teacher1, teacher2, stranger])
      await c.request("session");
    await admin.request("staff-login", {
      email: "admin@ensemble.local",
      password: "EnsembleAdmin2026",
    });
    await teacher1.request("staff-login", {
      email: "teacher-1@ensemble.local",
      password: "EnsembleTeacher2026",
    });
    await teacher2.request("staff-login", {
      email: "teacher-2@ensemble.local",
      password: "EnsembleTeacher2026",
    });
    await student.request("register", account(), "POST", 201);
    const verified = await student.request("verify", { code: "123456" }),
      id = verified.user.student_id;
    assert.match(id, /2026\/\d{4}/);
    const submit = (entries, medium = "English", expected = 201) =>
      student.request(
        "applications",
        { studentId: id, entries, preferredMedium: medium },
        "POST",
        expected,
      );
    const progress = (
      subjectId,
      grade,
      syllabusCompleted = true,
      passed = false,
      resultStatus = "",
    ) =>
      admin.request(
        "progress",
        {
          studentId: id,
          subjectId,
          grade,
          syllabusCompleted,
          passed,
          resultStatus,
        },
        "PUT",
      );
    await t.test("syllabus is required and explained", async () => {
      const catalog = await student.request("catalog");
      assert.match(
        catalog.subjects[0].grades.find((g) => g.grade === "Grade 1").reason,
        /syllabus/,
      );
      await submit([item()], "English", 409);
      await progress("piano", "Grade 1");
    });
    let first;
    await t.test("one grade creates pending records and real PDF", async () => {
      first = (await submit([item()])).application;
      assert.equal(first.applicationStatus, "pending");
      assert.equal(first.admissionAvailable, false);
      assert.equal(
        service.db.prepare("SELECT count(*) n FROM exam_items").get().n,
        1,
      );
      assert.equal(
        service.db.prepare("SELECT count(*) n FROM exam_documents").get().n,
        1,
      );
      const pdf = await student.request(`applications/${first.id}/pdf`);
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
      mkdirSync("qa", { recursive: true });
      writeFileSync("qa/exam-application.pdf", pdf);
    });
    await t.test(
      "duplicates are rejected within and across applications",
      async () => {
        await submit([item()], "English", 409);
        await progress("violin", "Grade 1");
        await submit([item("violin"), item("violin")], "English", 409);
      },
    );
    await t.test("Tamil multi-grade multi-subject records", async () => {
      for (const g of ["Grade 2", "Grade 3"]) await progress("piano", g);
      for (const g of ["Grade 1", "Grade 2", "Grade 3"])
        await progress("violin", g);
      const app = (
        await submit(
          [
            item("piano", "Grade 2"),
            item("piano", "Grade 3"),
            item("violin", "Grade 1", "teacher-2"),
            item("violin", "Grade 2", "teacher-2"),
            item("violin", "Grade 3", "teacher-2"),
          ],
          "Tamil",
        )
      ).application;
      assert.equal(app.entries.length, 5);
      assert.equal(app.preferredMedium, "Tamil");
    });
    await t.test("teacher ACLs block unrelated items and PDFs", async () => {
      const a = (await teacher1.request("applications")).applications;
      assert.ok(
        a.flatMap((a) => a.entries).every((e) => e.teacherId === "teacher-1"),
      );
      assert.equal(
        (await teacher2.request("applications")).applications.flatMap(
          (a) => a.entries,
        ).length,
        3,
      );
      await teacher2.request(
        "items/" + first.entries[0].id,
        { status: "approved" },
        "PATCH",
        403,
      );
      await teacher1.request(
        `applications/${first.id}/pdf`,
        undefined,
        "GET",
        403,
      );
      await student.request(
        `applications/${first.id}/admission`,
        undefined,
        "GET",
        403,
      );
      await stranger.request("applications", undefined, "GET", 401);
      await student.request(
        "items/" + first.entries[0].id,
        { status: "approved" },
        "PATCH",
        403,
      );
      await teacher1.request("config", { session: {} }, "PUT", 403);
    });
    await t.test(
      "approval and review statuses propagate to student",
      async () => {
        await teacher1.request(
          "items/" + first.entries[0].id,
          { status: "approved" },
          "PATCH",
        );
        assert.equal(
          (await student.request("applications")).applications.find(
            (a) => a.id === first.id,
          ).admissionAvailable,
          true,
        );
        const assigned = (await teacher2.request("applications"))
          .applications[0];
        await teacher2.request(
          "items/" + assigned.entries[0].id,
          { status: "changes-required", note: "Confirm repertoire" },
          "PATCH",
        );
        let app = (await student.request("applications")).applications.find(
          (a) => a.id === assigned.id,
        );
        assert.equal(app.applicationStatus, "changes-required");
        assert.equal(app.admissionAvailable, false);
        await teacher2.request(
          "items/" + assigned.entries[0].id,
          { status: "rejected", note: "Review syllabus" },
          "PATCH",
        );
        assert.equal(
          (await student.request("applications")).applications.find(
            (a) => a.id === assigned.id,
          ).applicationStatus,
          "rejected",
        );
      },
    );
    await t.test("admin filters and reroutes with approval reset", async () => {
      assert.equal(
        (
          await admin.request(
            "applications?studentId=" +
              encodeURIComponent(id) +
              "&subject=Piano&medium=English&status=approved",
          )
        ).applications.length,
        1,
      );
      await admin.request(
        "items/" + first.entries[0].id,
        { teacherId: "teacher-2" },
        "PATCH",
      );
      assert.equal(
        (await student.request("applications")).applications.find(
          (a) => a.id === first.id,
        ).applicationStatus,
        "pending",
      );
      await teacher1.request(
        "items/" + first.entries[0].id,
        { status: "approved" },
        "PATCH",
        403,
      );
      await teacher2.request(
        "items/" + first.entries[0].id,
        { status: "approved" },
        "PATCH",
      );
    });
    await t.test(
      "Grade 4 needs Grade 3; mixed subjects and one next exam",
      async () => {
        await progress("veena", "Grade 4");
        await submit([item("veena", "Grade 4")], "English", 409);
        await progress("veena", "Grade 3", true, true, "passed");
        await progress("veena", "Grade 5");
        await submit(
          [item("veena", "Grade 4"), item("veena", "Grade 5")],
          "English",
          409,
        );
        await progress("flute", "Grade 2");
        assert.equal(
          (
            await submit([
              item("veena", "Grade 4"),
              item("flute", "Grade 2", "teacher-2"),
            ])
          ).application.entries.length,
          2,
        );
      },
    );
    await t.test("withheld results and invalid medium blocked", async () => {
      await progress("mridangam", "Grade 1", true, false, "withheld");
      await submit([item("mridangam")], "English", 409);
      await submit([item("mridangam")], "French", 400);
    });
    await t.test("opening and exact inclusive deadline boundary", async () => {
      for (const g of ["Level 1", "Level 2", "Grade 1"])
        await progress("theory", g);
      const cfg = await admin.request("config");
      const save = (openingDate, deadline) =>
        admin.request(
          "config",
          { ...cfg, session: { ...cfg.session, openingDate, deadline } },
          "PUT",
        );
      await save(
        new Date(now + 1000).toISOString(),
        new Date(now + 5000).toISOString(),
      );
      await submit([item("theory", "Level 1")], "English", 409);
      const boundary = now + 5000;
      now = boundary - 1;
      await submit([item("theory", "Level 1")]);
      now = boundary;
      await submit([item("theory", "Level 2")]);
      now = boundary + 1;
      await submit([item("theory", "Grade 1")], "English", 409);
      await save("2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z");
    });
    await t.test("parent registration, child isolation and login", async () => {
      const parent = client(),
        other = client();
      await parent.request("session");
      await other.request("session");
      const p = {
        firstName: "Parent",
        lastName: "One",
        email: "parent@example.com",
        phone: "0779999999",
        password: "Parent2026",
        confirmPassword: "Parent2026",
      };
      await parent.request(
        "register",
        {
          role: "parent",
          parent: p,
          child: {
            firstName: "Child",
            lastName: "One",
            dateOfBirth: "2016-04-10",
          },
        },
        "POST",
        201,
      );
      await parent.request("verify", { code: "123456" });
      assert.equal((await parent.request("session")).children.length, 1);
      const added = await parent.request("add-candidate", {
        firstName: "Child",
        lastName: "Two",
        dateOfBirth: "2018-03-01",
      });
      await parent.request("select-child", {
        studentId: added.student.student_id,
      });
      await parent.request("catalog");
      await parent.request(
        "catalog?studentId=" + encodeURIComponent(id),
        undefined,
        "GET",
        403,
      );
      await other.request(
        "register",
        account("Other", "other@example.com"),
        "POST",
        201,
      );
      await other.request("verify", { code: "123456" });
      await other.request(
        `applications/${first.id}/pdf`,
        undefined,
        "GET",
        403,
      );
      await parent.request("logout", {});
      await parent.request("login", {
        role: "parent",
        email: p.email,
        password: p.password,
      });
      assert.equal((await parent.request("session")).children.length, 2);
    });
    await t.test(
      "age, invalid teacher, unknown subject and malformed dates",
      async () => {
        const young = client();
        await young.request("session");
        await young.request(
          "register",
          {
            role: "parent",
            parent: {
              firstName: "Guardian",
              lastName: "Young",
              email: "young@example.com",
              phone: "0771234567",
              password: "Parent2026",
              confirmPassword: "Parent2026",
            },
            child: {
              firstName: "Too",
              lastName: "Young",
              dateOfBirth: "2025-01-01",
            },
          },
          "POST",
          400,
        );
        await submit([item("unknown")], "English", 400);
        await submit(
          [item("piano", "Grade 2", "forged-teacher")],
          "English",
          400,
        );
        await admin.request(
          "config",
          {
            session: {
              name: "Test",
              openingDate: "invalid",
              deadline: "invalid",
            },
          },
          "PUT",
          400,
        );
      },
    );
    await t.test(
      "next Grade 5 is available only after Grade 4 passed",
      async () => {
        await progress("veena", "Grade 4", true, true, "passed");
        const catalog = await student.request("catalog");
        const veena = catalog.subjects.find((s) => s.id === "veena");
        assert.equal(
          veena.grades.find((g) => g.grade === "Grade 5").eligible,
          true,
        );
        assert.equal(
          veena.grades.find((g) => g.grade === "Grade 6").eligible,
          false,
        );
        await submit([item("veena", "Grade 5")]);
      },
    );
    await t.test(
      "restart preserves database and hashed credentials",
      async () => {
        const n = service.db
          .prepare("SELECT count(*) n FROM exam_applications")
          .get().n;
        const accounts = JSON.parse(
          service.db
            .prepare(
              "SELECT value FROM portal_values WHERE key='musicDemoAccounts'",
            )
            .get().value,
        );
        assert.ok(
          accounts
            .filter((a) => a.password)
            .every((a) => a.password.startsWith("scrypt:")),
        );
        await close();
        await start();
        assert.equal(
          service.db.prepare("SELECT count(*) n FROM exam_applications").get()
            .n,
          n,
        );
        assert.equal(
          (
            await student.request("login", {
              role: "student",
              email: id,
              password: "Password2026",
            })
          ).user.student_id,
          id,
        );
        assert.equal(
          (await student.request("applications")).applications.length,
          n,
        );
      },
    );
  } finally {
    if (service?.server.listening) await close();
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('default selection needs no prior teacher or Admin clearance', async () => {
 try {
  await start('false'); const student=client(); await student.request('session');
  await student.request('register',account('Default','default@example.com'),'POST',201);
  const session=await student.request('verify',{code:'123456'});
  const catalog=await student.request('catalog');
  assert.ok(catalog.subjects.every(s=>s.grades.filter(g=>g.eligible).length===7));
  assert.ok(catalog.subjects.every(s=>!s.grades.find(g=>g.grade==='Grade 4').eligible));
  const result=await student.request('applications',{studentId:session.user.student_id,preferredMedium:'English',entries:[item()]},'POST',201);
  assert.equal(result.application.applicationStatus,'pending');
  assert.equal(result.application.admissionAvailable,false);
 } finally { if(service?.server.listening)await close();rmSync(dir,{recursive:true,force:true}); }
});
