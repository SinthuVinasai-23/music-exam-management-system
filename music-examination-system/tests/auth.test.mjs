import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './auth-fixture.mjs';
import { createEmailSender } from '../auth-server/email.mjs';

test('Applicant authentication and SMTP delivery', async t => {
  const f = await fixture(); t.after(() => f.close());
  const password = 'MusicExam123!';
  for (const role of ['student', 'parent']) {
    await t.test(`${role}: register, SMTP delivery, verify, role matching, login`, async () => {
      const call = f.client(); await call();
      const email = `${role}.Exact@example.test`;
      const result = await call('register', { name: 'Music Applicant', email, password, role });
      assert.equal(result.status, 201); assert.equal(result.data.user, null);
      assert.equal(result.data.pending.role, role); assert.match(result.cookie, /HttpOnly; SameSite=Lax/);
      const mail = f.messages.at(-1); assert.deepEqual(mail.to, [email]); assert.match(mail.code, /^\d{6}$/);
      for (const text of ['Welcome to Your', 'Musical Journey', '15 minutes', 'Privacy Policy', 'Contact Support', 'Terms of Service', 'International Music Examination Board']) assert.ok(mail.text.includes(text));
      assert.ok(!JSON.stringify(result.data).includes(mail.code));
      const stored = f.db.prepare('SELECT * FROM auth_users WHERE email=?').get(email);
      assert.notEqual(stored.password_hash, password); assert.equal(stored.verified, 0);
      assert.notEqual(f.db.prepare('SELECT code_hash FROM auth_challenges WHERE user_id=?').get(stored.id).code_hash, mail.code);
      assert.equal((await call()).data.pending.role, role); // refresh
      assert.equal((await call('verify', { code: '000000' })).data.error, 'Invalid verification code');
      const verified = await call('verify', { code: mail.code }); assert.equal(verified.status, 200); assert.equal(verified.data.user.role, role); assert.equal(verified.data.pending, null);
      assert.equal((await call('verify', { code: mail.code })).status, 409);
      assert.equal((await call('resend', {})).status, 409);
      await call('logout', {});
      assert.equal((await call('login', { email, password: 'Wrong123!', role })).status, 401);
      assert.equal((await call('login', { email, password, role: role === 'student' ? 'parent' : 'student' })).status, 403);
      assert.equal((await call('login', { email, password, role })).data.user.role, role);
      assert.equal((await call('register', { name: 'Duplicate', email: email.toUpperCase(), password, role })).status, 409);
    });
  }
  await t.test('expiry, resend cooldown, previous-code invalidation and guess protection', async () => {
    const call = f.client(); await call();
    await call('register', { name: 'Expiry', email: 'expiry@example.test', password, role: 'student' });
    const first = f.messages.at(-1).code;
    assert.equal((await call('resend', {})).status, 429);
    f.advance(900001);
    assert.equal((await call('verify', { code: first })).status, 410);
    assert.equal((await call('resend', {})).status, 200);
    const next = f.messages.at(-1).code; assert.notEqual(first, next);
    assert.equal((await call('verify', { code: first })).status, 400);
    for (let i = 0; i < 4; i++) assert.equal((await call('verify', { code: '000000' })).status, 400);
    assert.equal((await call('verify', { code: next })).status, 429);
    f.advance(60001); await call('resend', {});
    assert.equal((await call('verify', { code: f.messages.at(-1).code })).status, 200);
  });
  await t.test('missing fields, invalid email/password/role, CSRF and unverified login', async () => {
    const call = f.client(); await call();
    const values = { name: 'Validate', email: 'validate@example.test', password, role: 'parent' };
    for (const patch of [{ name: '' }, { email: 'invalid' }, { email: 'Name<victim@example.test>' }, { email: 'victim@example.test,other' }, { password: '' }, { role: '' }]) assert.equal((await call('register', { ...values, ...patch })).status, 400);
    assert.equal((await fetch(`${f.base}/api/auth/register`, { method: 'POST', body: JSON.stringify(values) })).status, 403);
    await call('register', values); await call('logout', {});
    const result = await call('login', values); assert.equal(result.data.user, null); assert.equal(result.data.pending.role, 'parent');
  });
  await t.test('SMTP failure preserves inactive account and allows retry; unconfigured SMTP fails', async () => {
    const call = f.client(); await call(); f.reject(true);
    assert.equal((await call('register', { name: 'Failure', email: 'failure@example.test', password, role: 'parent' })).status, 503);
    const session = await call(); assert.equal(session.data.pending.delivery, 'failed'); assert.equal(session.data.user, null);
    assert.equal((await call('verify', { code: '000000' })).status, 400);
    f.reject(false); f.advance(60001); assert.equal((await call('resend', {})).status, 200);
    assert.equal((await call('verify', { code: f.messages.at(-1).code })).data.user.role, 'parent');
    await assert.rejects(createEmailSender({})({ email: 'none@example.test', code: '123456', name: 'Test', role: 'student' }), /EMAIL_NOT_CONFIGURED/);
  });
  await t.test('pending sessions cannot resend once account verified in another session', async () => {
    const first = f.client(), second = f.client(); await first(); await second();
    const values = { name: 'Tabs', email: 'tabs@example.test', password, role: 'student' };
    await first('register', values); await second('login', values);
    await first('verify', { code: f.messages.at(-1).code }); f.advance(60001);
    assert.equal((await second('resend', {})).status, 409);
  });
});
