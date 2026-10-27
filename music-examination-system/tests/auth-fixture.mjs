import { SMTPServer } from 'smtp-server';
import nodemailer from 'nodemailer';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAuthServer } from '../auth-server/server.mjs';
import { createEmailSender } from '../auth-server/email.mjs';

export async function fixture() {
  const messages = [];
  let reject = false, now = Date.now();
  const smtp = new SMTPServer({
    authOptional: true, disabledCommands: ['AUTH', 'STARTTLS'], logger: false,
    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', data => raw += data);
      stream.on('end', () => {
        if (reject) { callback(new Error('Test delivery failure')); return; }
        const text = raw.replace(/=\r?\n/g, '').replace(/=([\dA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const code = text.match(/verification code: (\d{6})/)?.[1];
        messages.push({ to: session.envelope.rcptTo.map(to => to.address), text, code });
        callback();
      });
    },
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  const smtpPort = smtp.server.address().port;
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'music-auth-test-'));
  const config = { SMTP_FROM: 'Music Exams <test@example.test>', AUTH_SECRET: 'test-only-secret-never-for-deployment' };
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: smtpPort, ignoreTLS: true });
  const app = await createAuthServer({ config, dataDir, clock: () => now, sendEmail: createEmailSender(config, transport) });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  config.APP_URL = base;
  function client() {
    let cookie = '', csrf;
    return async (action = 'session', body) => {
      const response = await fetch(`${base}/api/auth/${action}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { cookie, ...(csrf ? { 'X-CSRF-Token': csrf } : {}), 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = await response.json(); if (data.csrf) csrf = data.csrf;
      return { status: response.status, data, cookie: response.headers.get('set-cookie') };
    };
  }
  return { ...app, base, messages, client, reject(value) { reject = value; }, advance(ms) { now += ms; },
    async close() {
      transport.close();
      await new Promise(resolve => app.server.close(resolve));
      await new Promise(resolve => smtp.close(resolve));
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}
