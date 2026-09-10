import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  demoUser,
  assertAccess,
  lookup,
  verify,
  markAbsent,
  submitAttendance,
  readState,
} from "../src/supervisor/store.js";
const signedIn = () => ({ ...initialState(), user: { ...demoUser } });
test("only a verified Supervisor can access assigned sessions", () => {
  assert.throws(() => assertAccess(initialState(), "mozart"), /sign in/);
  for (const user of [
    { ...demoUser, role: "student" },
    { ...demoUser, emailVerified: false },
    { ...demoUser, assignedSessions: [] },
  ])
    assert.throws(() => assertAccess({ ...initialState(), user }, "mozart"));
  assert.doesNotThrow(() => assertAccess(signedIn(), "mozart"));
  assert.throws(() => assertAccess(signedIn(), "unknown"), /unauthorized/);
});
test("lookup accepts admission and normalized registration codes", () => {
  const state = signedIn();
  assert.equal(lookup(state, "mozart", " #772-art-24 ").name, "Ananya Nair");
  assert.equal(lookup(state, "mozart", "MUS-7K9P-2X4Q").id, "772-ART-24");
  assert.throws(() => lookup(state, "mozart", ""), /Enter/);
  assert.throws(() => lookup(state, "mozart", "missing"), /No candidate/);
});
test("cross-session candidate lookup and verification are rejected without mutation", () => {
  const state = signedIn(),
    before = JSON.stringify(state);
  assert.throws(() => lookup(state, "mozart", "630-DAN-24"), /unauthorized/);
  assert.throws(
    () =>
      verify(state, "mozart", "630-DAN-24", {
        idPresented: true,
        admissionPresented: true,
      }),
    /unauthorized/,
  );
  assert.equal(JSON.stringify(state), before);
});
test("verification requires both identity documents and consumes a code once", () => {
  const state = signedIn();
  assert.throws(
    () =>
      verify(state, "mozart", "772-ART-24", {
        idPresented: false,
        admissionPresented: true,
      }),
    /both/,
  );
  const result = verify(state, "mozart", "772-ART-24", {
    idPresented: true,
    admissionPresented: true,
  });
  assert.equal(result.candidates[0].status, "verified");
  assert.equal(result.candidates[0].consumed, true);
  assert.equal(result.candidates[0].verifiedBy, demoUser.id);
  assert.equal(result.events.length, 1);
  assert.equal(state.candidates[0].status, "pending");
  assert.throws(
    () =>
      verify(result, "mozart", "772-ART-24", {
        idPresented: true,
        admissionPresented: true,
      }),
    /used/,
  );
});
test("expired, ineligible, and used codes cannot be admitted", () => {
  const state = signedIn();
  state.candidates[0].expiresAt = "2020-01-01";
  assert.throws(() => lookup(state, "mozart", "772-ART-24"), /expired/);
  state.candidates[0].expiresAt = "2099-01-01";
  state.candidates[0].eligible = false;
  assert.throws(() => lookup(state, "mozart", "772-ART-24"), /eligibility/);
  assert.throws(() => lookup(state, "mozart", "902-ART-24"), /used/);
});
test("attendance blocks incomplete and empty rosters, persists closure, and rejects duplicate submission", () => {
  let state = signedIn();
  assert.throws(() => submitAttendance(state, "mozart"), /incomplete/);
  assert.throws(() => submitAttendance(state, "kriti"), /no candidates/);
  state = verify(state, "mozart", "772-ART-24", {
    idPresented: true,
    admissionPresented: true,
  });
  state = markAbsent(state, "mozart", "819-MUS-24");
  state = markAbsent(state, "mozart", "441-MUS-24");
  state = submitAttendance(state, "mozart");
  assert.equal(state.sessions[0].status, "closed");
  assert.throws(() => submitAttendance(state, "mozart"), /already/);
  assert.throws(() => markAbsent(state, "mozart", "819-MUS-24"), /cannot/);
  assert.throws(
    () =>
      verify(state, "mozart", "819-MUS-24", {
        idPresented: true,
        admissionPresented: true,
      }),
    /closed/,
  );
  const restored = readState({ getItem: () => JSON.stringify(state) });
  assert.deepEqual(restored, state);
});
test("absent can return to pending while verified records cannot be edited", () => {
  let state = markAbsent(signedIn(), "mozart", "819-MUS-24");
  assert.equal(state.candidates[1].status, "absent");
  state = markAbsent(state, "mozart", "819-MUS-24");
  assert.equal(state.candidates[1].status, "pending");
  assert.throws(() => markAbsent(state, "mozart", "902-ART-24"), /cannot/);
});
test("missing storage initializes; corrupt and invalid data are rejected", () => {
  assert.equal(readState({ getItem: () => null }).version, 1);
  for (const data of ["bad json", "{}", '{"version":1,"sessions":[]}'])
    assert.throws(() => readState({ getItem: () => data }));
});
