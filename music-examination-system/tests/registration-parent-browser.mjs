import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.env.BASE_URL || "http://127.0.0.1:5173",
  stamp = Date.now();
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const fill = (label, value) =>
  page.getByLabel(label, { exact: true }).fill(value);
async function session() {
  return (await page.request.get(base + "/api/portal/session")).json();
}
const last =
  "Family" +
  String(stamp).replace(/[0-9]/g, (n) => String.fromCharCode(65 + Number(n)));
try {
  await page.goto(base + "/register");
  await page
    .getByRole("button", { name: "Register as Student", exact: true })
    .click();
  await fill("First Name", "Emma");
  await fill("Last Name", last);
  await fill("Date of Birth", "2013-05-10");
  await page.getByRole("alert").filter({ hasText: "under 16" }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Register", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Continue with Parent Registration" })
    .click();
  assert.equal(
    await page.getByLabel("Student First Name", { exact: true }).inputValue(),
    "Emma",
  );
  for (const [label, value] of [
    ["Parent First Name", "Jane"],
    ["Parent Last Name", last],
    ["Parent Phone Number", "0771234567"],
    ["Parent Email Address", `parent${stamp}@example.com`],
    ["Password", "Music1234"],
    ["Confirm Password", "Mismatch1234"],
  ])
    await fill(label, value);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "match" }).waitFor();
  await fill("Confirm Password", "Music1234");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.waitForURL("**/verify-email");
  await fill("Verification Code", "111111");
  await page.getByRole("button", { name: "VERIFY", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Invalid" }).waitFor();
  await page.getByRole("button", { name: "Resend Code", exact: true }).click();
  await page.getByRole("status").waitFor();
  await fill("Verification Code", "123456");
  await page.getByRole("button", { name: "VERIFY", exact: true }).click();
  await page.waitForURL("**/parent/dashboard");
  const first = (await session()).children[0];
  await page
    .getByRole("link", { name: "Add New Candidate", exact: true })
    .click();
  await fill("Student First Name", "  emma  ");
  await fill("Student Last Name", last.toLowerCase());
  await fill("Date of Birth", "2013-05-10");
  await page
    .getByRole("button", { name: "Add Candidate", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "already be registered" })
    .waitFor();
  await fill("Student First Name", "Oliver");
  await page
    .getByRole("button", { name: "Add Candidate", exact: true })
    .click();
  await page.waitForURL("**/parent/dashboard");
  const children = (await session()).children;
  assert.equal(children.length, 2);
  assert.notEqual(children[0].student_id, children[1].student_id);
  await page
    .locator(".parent-candidate-grid article")
    .first()
    .getByRole("link", { name: "View Student Dashboard" })
    .click();
  await page
    .getByText("Student ID: " + first.student_id, { exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Parent Dashboard", exact: true })
    .click();
  await page
    .locator(".parent-candidate-grid article")
    .last()
    .getByRole("link", { name: "View Student Dashboard" })
    .click();
  await page
    .getByText("Student ID: " + children[1].student_id, { exact: true })
    .waitFor();
  await page.goto(base + "/student/applications");
  await page
    .getByText("No examination applications yet.", { exact: true })
    .waitFor();
  await page.goto(base + "/parent/dashboard");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await fill("Email or Student ID", `parent${stamp}@example.com`);
  await fill("Password", "Music1234");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.waitForURL("**/parent/dashboard");
  assert.equal((await session()).children.length, 2);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: parent UI registration, under-16 handoff, password confirmation, verification/resend, normalized duplicate detection, sibling IDs, child switching/isolation, mobile and returning parent login.",
  );
} finally {
  await browser.close();
}
