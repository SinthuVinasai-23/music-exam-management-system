import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.BASE_URL || "http://127.0.0.1:5175",
  stamp = Date.now();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const student = await browser.newContext(),
  admin = await browser.newContext();
const page = await student.newPage(),
  ap = await admin.newPage(),
  errors = [];
for (const p of [page, ap]) {
  p.setDefaultNavigationTimeout(60000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
}
async function api(
  ctx,
  route,
  data,
  method = data === undefined ? "GET" : "POST",
) {
  const session = await (
    await ctx.request.get(base + "/api/portal/session")
  ).json();
  const r = await ctx.request.fetch(base + "/api/portal/" + route, {
    method,
    headers: { "X-CSRF-Token": session.csrf },
    data,
  });
  assert.ok(r.ok(), await r.text());
  return r.json();
}
try {
  await api(student, "register", {
    role: "student",
    firstName: "Learning",
    lastName:
      "Browser" +
      String(stamp).replace(/\d/g, (n) => String.fromCharCode(65 + Number(n))),
    dateOfBirth: "2000-02-10",
    phone: "0771234567",
    email: `learning${stamp}@example.com`,
    password: "Learning2026",
    confirmPassword: "Learning2026",
  });
  const user = (await api(student, "verify", { code: "123456" })).user,
    id = user.student_id;
  await api(admin, "staff-login", {
    email: "admin@ensemble.local",
    password: "EnsembleAdmin2026",
  });
  await api(
    admin,
    "learning-stage",
    { studentId: id, subjectId: "piano", grade: "Grade 3" },
    "PUT",
  );
  await page.goto(base + "/student/dashboard");
  await page.getByRole("heading", { name: "Welcome back, Learning" }).waitFor();
  await page.locator(".learning-subject-card").first().waitFor();
  assert.equal(await page.locator(".learning-subject-card").count(), 8);
  await page
    .getByRole("link", { name: /Explore Subject/ })
    .first()
    .click();
  await page.waitForURL("**/student/subjects/piano");
  await page.getByRole("heading", { name: "Practice Questions" }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Grade 4 Not yet available", exact: true })
      .isDisabled(),
  );
  for (const grade of ["Grade 1", "Grade 2", "Grade 3"]) {
    await page
      .getByRole("button", { name: new RegExp("^" + grade + " ") })
      .click();
    await page.locator(".learning-question-card h3").waitFor();
  }
  await page.locator(".learning-options button").first().click();
  await page.getByRole("button", { name: "Check Answer", exact: true }).click();
  await page.locator(".learning-feedback").waitFor();
  await page.reload();
  await page.getByText("1 practice answers", { exact: false }).waitFor();
  await page.goto(base + "/student/account");
  await page.getByLabel("Preferred Learning Medium").selectOption("Tamil");
  await page.getByRole("button", { name: "Save Preferences" }).click();
  await page.getByRole("status").waitFor();
  await page.goto(base + "/student/subjects/piano");
  await page.getByRole("heading", { name: "பயிற்சி வினாக்கள்" }).waitFor();
  await page.locator(".learning-question-card h3").waitFor();
  assert.ok(
    /[\u0B80-\u0BFF]/.test(
      await page.locator(".learning-question-card h3").innerText(),
    ),
  );
  assert.ok(
    !/[A-Za-z]/.test(
      await page.locator(".learning-instructions").first().innerText(),
    ),
  );
  mkdirSync("test-results/learning", { recursive: true });
  for (const width of [1920, 1440, 1366, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/student/dashboard",
      "/student/subjects/piano",
      "/about",
    ]) {
      await page.goto(base + route);
      await page
        .locator(
          route === "/about"
            ? ".about-hero"
            : route.includes("/subjects/")
              ? ".learning-subject-hero"
              : ".learning-subject-card",
        )
        .first()
        .waitFor();
      if (route.includes("/subjects/"))
        await page.locator(".learning-question-card h3").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route + " overflow at " + width,
      );
      await page.screenshot({
        path:
          "test-results/learning/" +
          width +
          "-" +
          route.split("/").at(-1) +
          ".png",
        fullPage: true,
      });
    }
  }
  await ap.goto(base + "/dashboard/admin");
  await ap.getByText("About Us Editor", { exact: true }).click();
  const original = await api(admin, "about");
  await ap
    .getByLabel("About Title", { exact: true })
    .fill("Music For Everyone " + stamp);
  await ap
    .getByRole("button", { name: "Preview About Us", exact: true })
    .click();
  await ap.locator(".learning-about-preview h2").waitFor();
  assert.equal(
    await ap.locator(".learning-about-preview h2").innerText(),
    "Music For Everyone " + stamp,
  );
  await Promise.all([
    ap.waitForResponse(
      (r) =>
        r.url().endsWith("/api/portal/about") &&
        r.request().method() === "PUT" &&
        r.status() === 200,
    ),
    ap.getByRole("button", { name: "Save About Us", exact: true }).click(),
  ]);
  await ap.getByText("Content saved successfully.", { exact: true }).waitFor();
  console.log("Saved About", (await api(admin, "about")).title);
  await page.goto(base + "/about");
  await page
    .getByRole("heading", { name: "Music For Everyone " + stamp, exact: true })
    .waitFor();
  await api(admin, "about", original, "PUT");
  await ap.getByText("Bilingual Question Bank", { exact: true }).click();
  await ap.getByRole("button", { name: "New Question", exact: true }).click();
  await ap
    .getByLabel("English Question", { exact: true })
    .fill("Which hand can play the piano?");
  await ap
    .getByLabel("English Options (one per line)", { exact: true })
    .fill("Both hands\nNeither hand");
  await ap
    .getByLabel("Tamil Question", { exact: true })
    .fill("பியானோவை எந்தக் கையால் வாசிக்கலாம்?");
  await ap
    .getByLabel("Tamil Options (one per line)", { exact: true })
    .fill("இரு கைகளாலும்\nஎந்தக் கையாலும் முடியாது");
  await Promise.all([
    ap.waitForResponse(
      (r) =>
        r.url().endsWith("/api/portal/questions") &&
        r.request().method() === "POST" &&
        r.status() === 201,
    ),
    ap.getByRole("button", { name: "Save Question", exact: true }).click(),
  ]);
  await ap.getByText("Content saved successfully.", { exact: true }).waitFor();
  const newQuestion = (
    await api(admin, "questions?subjectId=piano")
  ).questions.find(
    (q) => q.english?.question === "Which hand can play the piano?",
  );
  assert.ok(newQuestion);
  assert.equal(newQuestion.english.options.length, 2);
  await api(
    admin,
    "questions/" + newQuestion.id,
    { ...newQuestion, subjectId: "piano", answerIndex: 0, active: false },
    "PUT",
  );
  await api(student, "logout", {});
  await page.goto(base + "/login");
  await page.getByRole("link", { name: "Forgot Password?" }).click();
  await page.getByLabel("Registered Email or Student ID").fill(id);
  await page.getByRole("button", { name: "Continue to Verification" }).click();
  await page.getByLabel("Verification Code").fill("123456");
  await page.getByRole("button", { name: "Verify Code", exact: true }).click();
  await page.getByLabel("New Password", { exact: true }).fill("Recovered2026");
  await page
    .getByLabel("Confirm New Password", { exact: true })
    .fill("Recovered2026");
  await page
    .getByRole("button", { name: "Reset Password", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Return to Login", exact: true })
    .click();
  await page.getByLabel("Email or Student ID").fill(id);
  await page.getByLabel("Password", { exact: true }).fill("Recovered2026");
  await page.getByRole("button", { name: "Sign in securely →" }).click();
  await page.waitForURL("**/student/dashboard");
  assert.equal((await api(student, "session")).user.student_id, id);
  assert.equal((await api(student, "learning/piano")).stats.attempts, 1);
  assert.equal((await api(student, "learning")).preferredMedium, "Tamil");
  assert.deepEqual(errors, []);
  writeFileSync(
    "test-results/learning/report.json",
    JSON.stringify(
      { passed: true, widths: [1920, 1440, 1366, 1024, 768, 390, 375], errors },
      null,
      2,
    ),
  );
  console.log(
    "Learning, Tamil, Admin editing, recovery and 21 responsive page checks passed.",
  );
} catch (e) {
  console.log("PAGE", await page.locator("body").innerText());
  console.log(
    "ADMIN",
    await ap
      .getByLabel("About Title", { exact: true })
      .inputValue()
      .catch(() => "not loaded"),
  );
  await page.screenshot({
    path: "test-results/learning/failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser.close();
}
