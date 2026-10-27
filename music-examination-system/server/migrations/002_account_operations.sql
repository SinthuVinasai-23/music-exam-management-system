ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE login_attempts(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,window_start REAL NOT NULL);
CREATE TABLE contacts(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL);
ALTER TABLE refund_jobs ADD COLUMN receipt_reference TEXT;
ALTER TABLE refund_jobs ADD COLUMN completed_at TEXT;
CREATE TABLE refund_allocations(id TEXT PRIMARY KEY,refund_id TEXT NOT NULL REFERENCES refund_jobs(id),payment_id TEXT NOT NULL REFERENCES payment_allocations(id),amount INTEGER NOT NULL CHECK(amount>0));
