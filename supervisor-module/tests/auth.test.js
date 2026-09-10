import test from "node:test";
import assert from "node:assert/strict";
import {
  STAFF_SESSION_KEY,
  clearStaffSession,
  createStaffSession,
  readStaffSession,
  saveStaffSession,
  validateStaffCredentials,
} from "../src/auth.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("staff credentials require a valid email and eight-character password", () => {
  assert.match(validateStaffCredentials("bad", "password").error, /email/);
  assert.match(
    validateStaffCredentials("staff@example.com", "short").error,
    /8 characters/,
  );
  assert.deepEqual(
    validateStaffCredentials(" Staff@Example.com ", "password"),
    { email: "staff@example.com" },
  );
});

test("only the implemented Supervisor role can create a staff session", () => {
  const session = createStaffSession("staff@example.com", "supervisor");
  assert.equal(session.role, "supervisor");
  assert.throws(
    () => createStaffSession("staff@example.com", "teacher"),
    /not available/,
  );
});

test("staff session saves, validates, and clears", () => {
  const storage = memoryStorage();
  const session = createStaffSession("staff@example.com", "supervisor");
  saveStaffSession(session, storage);
  assert.equal(readStaffSession(storage).email, "staff@example.com");
  clearStaffSession(storage);
  assert.equal(storage.getItem(STAFF_SESSION_KEY), null);
  assert.equal(readStaffSession(storage), null);
});

test("corrupt or unauthorized staff sessions are rejected", () => {
  for (const value of [
    "bad json",
    JSON.stringify({
      version: 1,
      email: "staff@example.com",
      role: "admin",
      authenticatedAt: new Date().toISOString(),
    }),
  ]) {
    assert.equal(readStaffSession({ getItem: () => value }), null);
  }
});
