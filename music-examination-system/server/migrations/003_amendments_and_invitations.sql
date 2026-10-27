ALTER TABLE users ADD COLUMN requires_password_setup INTEGER NOT NULL DEFAULT 0;
CREATE TABLE teacher_invitations(id TEXT PRIMARY KEY,requested_by TEXT NOT NULL REFERENCES users(id),teacher_id TEXT NOT NULL REFERENCES users(id),subject_id TEXT NOT NULL REFERENCES subjects(id),status TEXT NOT NULL DEFAULT 'pending',created TEXT NOT NULL,UNIQUE(teacher_id,subject_id));
CREATE TABLE application_amendments(id TEXT PRIMARY KEY,application_id TEXT NOT NULL REFERENCES applications(id),actor TEXT NOT NULL REFERENCES users(id),previous_snapshot TEXT NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL);
ALTER TABLE results ADD COLUMN feedback TEXT NOT NULL DEFAULT '';
