import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.BASE_URL || "http://127.0.0.1:5173",
  stamp = Date.now();
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  errors = [];
const student = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  admin = await browser.newContext(),
  teacher = await browser.newContext();
const watchConsole=p=>p.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const page = await student.newPage();
watchConsole(page);
page.on("pageerror", (e) => errors.push(e.message));
async function api(
  context,
  route,
  data,
  method = data === undefined ? "GET" : "POST",
) {
  const session = await (
    await context.request.get(base + "/api/portal/session")
  ).json();
  const result = await context.request.fetch(base + "/api/portal/" + route, {
    method,
    headers: { "X-CSRF-Token": session.csrf },
    data,
  });
  assert.ok(result.ok(), await result.text());
  return result.json();
}
try {
  // Register in the actual UI, including confirmation and verification.
  await page.goto(base + "/register");
  await page
    .getByRole("button", { name: "Register as Student", exact: true })
    .click();
  for (const [label, value] of [
    ["First Name", "Browser"],
    [
      "Last Name",
      "Candidate" +
        String(stamp).replace(/[0-9]/g, (n) =>
          String.fromCharCode(65 + Number(n)),
        ),
    ],
    ["Date of Birth", "2000-01-01"],
    ["Phone Number", "0771234567"],
    ["Email Address", `browser${stamp}@example.com`],
    ["Password", "Browser2026"],
    ["Confirm Password", "Browser2026"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.waitForURL("**/verify-email");
  await page.getByLabel("Verification Code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "VERIFY", exact: true }).click();
  await page.waitForURL("**/student/dashboard");
  const id = (await api(student, "session")).user.student_id;
  await api(admin, "staff-login", {
    email: "admin@ensemble.local",
    password: "EnsembleAdmin2026",
  });
  for (const subjectId of ["piano", "violin"])
    for (const grade of ["Grade 1", "Grade 2", "Grade 3"])
      await api(
        admin,
        "progress",
        { studentId: id, subjectId, grade, syllabusCompleted: true },
        "PUT",
      );
  await page
    .getByRole("button", { name: "New Application", exact: true })
    .click();
  await page.waitForURL("**/student/application");
  await page
    .getByLabel("Student Photo", { exact: true })
    .setInputFiles("src/assets/mridangam-hands.png");
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 130, box.y + 70, { steps: 12 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Next Page" }).click();
  await page.waitForURL("**/selection");
  await page
    .getByRole("button", { name: "Add Subject", exact: true })
    .waitFor();
  assert.equal(
    await page.getByText(/checkout|credit card|payment amount/i).count(),
    0,
  );
  async function add(subject, grades, teacherId) {
    await page
      .getByRole("button", { name: "Add Subject", exact: true })
      .click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Subject", { exact: true }).selectOption(subject);
    for (const grade of grades)
      await modal.getByRole("checkbox", { name: grade, exact: true }).check();
    await modal.getByLabel("Teacher", { exact: true }).selectOption(teacherId);
    await modal.getByRole("button", { name: "Add to Application" }).click();
    await modal.waitFor({ state: "hidden" });
  }
  await add("piano", ["Grade 1", "Grade 2", "Grade 3"], "teacher-1");
  await page
    .getByRole("button", { name: "Remove Piano Grade 1", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Remove Piano Grade 1", exact: true })
      .count(),
    0,
  );
  await add("violin", ["Grade 1"], "teacher-2");
  await page
    .getByRole("button", { name: "Remove Violin", exact: true })
    .click();
  await add("violin", ["Grade 1"], "teacher-2");
  await page.getByRole("radio", { name: "Tamil", exact: true }).check();
  await page.getByText("Royal Music Academy", { exact: true }).waitFor();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "selection overflow at " + width,
    );
    await page.screenshot({
      path: `test-results/exam-selection-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Add Subject", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Subject", { exact: true })
      .selectOption("veena");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "dialog overflow",
    );
    await page.screenshot({
      path: `test-results/exam-dialog-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Review Application" }).click();
  await page.waitForURL("**/confirmation");
  await page
    .getByRole("button", { name: "Submit Application", exact: true })
    .waitFor();
  await page.getByText("Royal Music Academy", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Submit Application", exact: true })
    .click();
  await page.waitForURL("**/applications?submitted=*");
  await page
    .getByRole("heading", { name: "Application Submitted Successfully" })
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Exam Access", exact: true }).count(),
    0,
  );
  const application = (await api(student, "applications")).applications[0];
  assert.equal(application.entries.length, 3);
  assert.equal(application.applicationStatus, "pending");
  const downloadWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const download = await downloadWait;
  assert.match(download.suggestedFilename(), /\.pdf$/);
  await download.saveAs("test-results/exam-browser-download.pdf");
  let requested = false;
  page.on("request", (r) => {
    if (r.url().endsWith("/pdf")) requested = true;
  });
  await page
    .getByRole("button", { name: "Print Application", exact: true })
    .first()
    .click();
  await page.waitForFunction(
    () => !!document.querySelector('iframe[title="Print application PDF"]'),
  );
  await page.evaluate(() => {
    const f = document.querySelector('iframe[title="Print application PDF"]');
    window.__printCalled = false;
    f.contentWindow.print = () => {
      window.__printCalled = true;
    };
    f.onload();
  });
  await page.waitForFunction(() => window.__printCalled);
  assert.ok(requested);
  await page.screenshot({
    path: "test-results/exam-success.png",
    fullPage: true,
  });
  const teacherPage = await teacher.newPage();
watchConsole(teacherPage);
  teacherPage.on("pageerror", (e) => errors.push(e.message));
  await teacherPage.goto(base + "/teacher/exam-applications");
  await teacherPage
    .getByLabel("Email", { exact: true })
    .fill("teacher-1@ensemble.local");
  await teacherPage
    .getByLabel("Password", { exact: true })
    .fill("EnsembleTeacher2026");
  await teacherPage
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await teacherPage
    .getByRole("heading", { name: "Exam Applications", exact: true })
    .waitFor();
  await teacherPage
    .getByText(application.id + " · " + application.candidateName, {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await teacherPage.getByText("Violin · Grade 1", { exact: true }).count(),
    0,
  );
  while (
    await teacherPage
      .getByRole("button", { name: "Approved", exact: true })
      .count()
  ) {
    const button = teacherPage
      .getByRole("button", { name: "Approved", exact: true })
      .first();
    await button.click();
    await teacherPage.getByRole("status").waitFor();
    break;
  }
  // Approve the remaining assigned items, then the independently assigned Violin item.
  let assigned = (await api(teacher, "applications")).applications.find(
    (a) => a.id === application.id,
  );
  for (const item of assigned.entries)
    await api(teacher, "items/" + item.id, { status: "approved" }, "PATCH");
  assert.equal(
    (await api(student, "applications")).applications[0].admissionAvailable,
    false,
  );
  await api(teacher, "staff-login", {
    email: "teacher-2@ensemble.local",
    password: "EnsembleTeacher2026",
  });
  assigned = (await api(teacher, "applications")).applications.find(
    (a) => a.id === application.id,
  );
  assert.equal(assigned.entries.length, 1);
  await api(
    teacher,
    "items/" + assigned.entries[0].id,
    { status: "approved" },
    "PATCH",
  );
  await page.reload();
  await page.getByRole("link", { name: "Exam Access", exact: true }).waitFor();
  assert.equal(
    (await api(student, "applications")).applications[0].admissionAvailable,
    true,
  );
  const adminPage = await admin.newPage();
watchConsole(adminPage);
  adminPage.on("pageerror", (e) => errors.push(e.message));
  await adminPage.goto(base + "/dashboard/admin");
  await adminPage
    .getByRole("heading", { name: "Examination Administration" })
    .waitFor();
  await adminPage.getByLabel("Student ID", { exact: true }).fill(id);
  await adminPage
    .getByText(application.id + " · " + application.candidateName, {
      exact: true,
    })
    .waitFor();
  await adminPage.getByRole("button", { name: "Save Configuration" }).click();
  await adminPage.getByRole("status").waitFor();
  for (const width of [1440, 768, 390]) {
    await adminPage.setViewportSize({ width, height: 1000 });
    assert.ok(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "admin overflow " + width,
    );
    await adminPage.screenshot({
      path: `test-results/exam-admin-${width}.png`,
      fullPage: true,
    });
  }
  // Realtime deadline update: refresh the selection and verify both controls and server reject.
  const config = await api(admin, "config");
  await api(
    admin,
    "config",
    {
      ...config,
      session: {
        ...config.session,
        openingDate: "2020-01-01T00:00:00Z",
        deadline: "2020-01-02T00:00:00Z",
      },
    },
    "PUT",
  );
  await page.goto(base + "/student/application/selection");
  await page
    .getByRole("alert")
    .filter({ hasText: "deadline has passed" })
    .waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Add Subject", exact: true })
      .isDisabled(),
  );
  assert.ok(
    await page.getByRole("button", { name: "Review Application" }).isDisabled(),
  );
  await api(admin, "config", config, "PUT");
  await page.goto(base + "/student/payment");
  await page.waitForURL("**/student/applications");
  assert.equal(
    await page.getByText(/checkout|credit card|payment successful/i).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: UI registration/verification, photo/signature, Add Subject, grade/subject removal, multi-subject Tamil, teacher school, review/success, PDF download and print request, teacher isolation/approval, admin controls, deadline closure, 4 responsive widths and no page errors.",
  );
} catch (e) {
  await page.screenshot({
    path: "test-results/exam-failure.png",
    fullPage: true,
  });
  console.error(
    "Failed at",
    page.url(),
    await page.getByRole("alert").allTextContents(),
  );
  throw e;
} finally {
  await browser.close();
}
