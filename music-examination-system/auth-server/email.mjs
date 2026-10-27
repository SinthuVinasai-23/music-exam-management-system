import nodemailer from 'nodemailer';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function verificationMessage({email, name, code, role}, config) {
  const url = config.APP_URL || 'http://127.0.0.1:5173';
  const links = { privacy: config.PRIVACY_URL || `${url}/faq`, support: `${url}/contact`, terms: config.TERMS_URL || `${url}/faq` };
  const formatted = `${code.slice(0,3)} · ${code.slice(3)}`;
  return {
    from: config.SMTP_FROM, to: { address: email }, subject: `Verify your ${role === 'parent' ? 'Parent' : 'Student'} registration — Music Examination System`,
    text: `Welcome to Your Musical Journey\n\nHello ${name},\nTo complete your ${role} registration, enter this verification code: ${code}\n\nThis code is valid for the next 15 minutes.\nVerify: ${url}/verify-email\nIf you did not request this verification, contact support.\nPrivacy Policy: ${links.privacy}\nContact Support: ${links.support}\nTerms of Service: ${links.terms}\n© ${new Date().getFullYear()} International Music Examination Board. All rights reserved.`,
    html: `<!doctype html><html><body style="margin:0;background:#f7f7f7"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:#fff;border-radius:5px;color:#625e54;font-family:Arial,sans-serif;text-align:center"><tr><td style="padding:45px 35px 20px"><div style="text-align:right;color:#e9e9e9;font-size:45px;line-height:12px">♪</div><h1 style="font-family:Georgia,serif;font-size:42px;line-height:1.2;color:#806900;margin:10px 0 20px">Welcome to Your<br>Musical Journey</h1><div style="width:48px;height:2px;background:#efca66;margin:auto"></div></td></tr><tr><td style="padding:20px 50px 35px;font-size:18px;line-height:30px">To begin your formal registration for the upcoming examination cycle, please use the secure verification code provided below.</td></tr><tr><td style="padding:12px 49px"><table role="presentation" width="100%" style="border:1px solid #f0e5cb;border-radius:32px"><tr><td style="padding:38px 10px"><div style="font-size:12px;letter-spacing:1.3px;color:#817767">VERIFICATION CODE</div><div style="font-weight:bold;font-size:64px;letter-spacing:7px;color:#806900;padding-top:18px">${escape(formatted)}</div></td></tr></table></td></tr><tr><td style="padding:15px 30px"><a href="${escape(url)}/verify-email" style="display:inline-block;border-radius:28px;background:#806900;color:#fff;text-decoration:none;font-size:12px;letter-spacing:.5px;padding:16px 42px">VERIFY</a></td></tr><tr><td style="padding:5px 49px 15px;font-size:16px;line-height:26px">This code is valid for the next <span style="color:#806900">15 minutes.</span> If you did not request this verification, please contact our support team immediately.</td></tr><tr><td style="padding:15px 49px 45px"><div style="border-top:1px solid #f1f1f1;padding-top:28px;font-size:12px"><a href="${escape(links.privacy)}" style="color:#555;text-decoration:none">Privacy Policy</a> &nbsp;&nbsp; <a href="${escape(links.support)}" style="color:#555;text-decoration:none">Contact Support</a> &nbsp;&nbsp; <a href="${escape(links.terms)}" style="color:#555;text-decoration:none">Terms of Service</a></div><p style="font-size:12px;color:#888;margin-top:18px">© ${new Date().getFullYear()} International Music Examination Board. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`
  };
}
export function createEmailSender(config, transport) {
  let smtp = transport;
  return async data => {
    if (!smtp) {
      if (!config.SMTP_HOST || !config.SMTP_FROM || !config.SMTP_USER || !config.SMTP_PASS) throw new Error('EMAIL_NOT_CONFIGURED');
      smtp = nodemailer.createTransport({host:config.SMTP_HOST,port:Number(config.SMTP_PORT || 587),secure:config.SMTP_SECURE==='true',requireTLS:config.SMTP_SECURE!=='true',auth:{user:config.SMTP_USER,pass:config.SMTP_PASS},connectionTimeout:10000,socketTimeout:20000});
    }
    const result=await smtp.sendMail(verificationMessage(data,config));
    if (!result.accepted?.length || result.rejected?.includes(data.email)) throw new Error('EMAIL_REJECTED');
  };
}
