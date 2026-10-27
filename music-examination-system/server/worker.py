"""One durable email worker. Run under a supervisor; SMTP is never used in tests."""
import os
import ssl
import smtplib
import time
from email.message import EmailMessage
from email.utils import formataddr
from app import create_app

RETRY_DELAYS = (60, 300, 1800)

def deliver(app, record):
    host=os.environ.get('SMTP_HOST'); sender=os.environ.get('SMTP_FROM')
    if not host or not sender: raise RuntimeError('SMTP configuration is missing')
    msg=EmailMessage(); msg['From']=formataddr(('Music Examination Board',sender)); msg['To']=record['email']; msg['Subject']=record['subject']; msg['Message-ID']=f'<{record["id"]}@{sender.split("@")[-1]}>'
    msg.set_content('MUSIC EXAMINATION BOARD\n\n'+record['body']+'\n\nSign in to your Music Examination Management Portal for details.\nIf you need assistance, contact the examination office.')
    if record['attachment_entry']: msg.add_attachment(app.admission_pdf(record['attachment_entry']),maintype='application',subtype='pdf',filename='admission-card.pdf')
    with smtplib.SMTP(host,int(os.getenv('SMTP_PORT','587')),timeout=20) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        if os.getenv('SMTP_USER'): smtp.login(os.environ['SMTP_USER'],os.environ['SMTP_PASSWORD'])
        smtp.send_message(msg)

def tick(app, sender=deliver, clock=time.time):
    with app.app_context():
        db=app.db()
        # Recover a crashed worker's expired ten-minute claim.
        db.execute("UPDATE notifications SET status='pending' WHERE status='sending' AND next_attempt<?",(clock(),)); db.commit()
        records=db.execute("SELECT n.*,u.email FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.status='pending' AND n.next_attempt<=? ORDER BY n.created LIMIT 30",(clock(),)).fetchall()
        for row in records:
            record=dict(row)
            claimed=db.execute("UPDATE notifications SET status='sending',next_attempt=? WHERE id=? AND status='pending'",(clock()+600,record['id'])).rowcount; db.commit()
            if not claimed: continue
            try:
                sender(app,record)
                db.execute("UPDATE notifications SET status='delivered',attempts=attempts+1,last_error=NULL,body=CASE WHEN event='Verify your email' THEN '[Verification link redacted after delivery]' ELSE body END WHERE id=?",(record['id'],))
            except Exception as error:
                attempts=record['attempts']+1
                # Log only exception type: provider exceptions can contain credentials/PII.
                db.execute('UPDATE notifications SET status=?,attempts=?,next_attempt=?,last_error=? WHERE id=?',('undeliverable' if attempts>=4 else 'pending',attempts,clock()+RETRY_DELAYS[min(attempts-1,2)],type(error).__name__,record['id']))
            db.commit()

if __name__=='__main__':
    app=create_app()
    while True:
        tick(app); time.sleep(10)
