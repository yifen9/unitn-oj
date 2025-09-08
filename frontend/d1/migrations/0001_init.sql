PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
  id            TEXT    PRIMARY KEY,
  slug          TEXT    NOT NULL UNIQUE  CHECK   (slug GLOB '[-a-z0-9]*' AND length(slug) BETWEEN 1 AND 64),
  name          TEXT                     CHECK   (name IS NULL OR length(name) BETWEEN 1 AND 64),
  description   TEXT                     CHECK   (description IS NULL OR length(description) BETWEEN 1 AND 4096),
  created_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_s  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TRIGGER IF NOT EXISTS trg_schools_touch_updated_at
AFTER UPDATE ON schools
FOR EACH ROW
WHEN NEW.updated_at_s = OLD.updated_at_s
BEGIN
  UPDATE schools
     SET updated_at_s = unixepoch()
   WHERE rowid = NEW.rowid;
END;

CREATE TABLE IF NOT EXISTS courses (
  id            TEXT    PRIMARY KEY,
  school_id     TEXT    NOT NULL,
  slug          TEXT    NOT NULL CHECK   (slug GLOB '[-a-z0-9]*' AND length(slug) BETWEEN 1 AND 64),
  name          TEXT             CHECK   (name IS NULL OR length(name) BETWEEN 1 AND 64),
  description   TEXT             CHECK   (description IS NULL OR length(description) BETWEEN 1 AND 4096),
  created_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
  UNIQUE      (school_id, slug)
);

CREATE TRIGGER IF NOT EXISTS trg_courses_touch_updated_at
AFTER UPDATE ON courses
FOR EACH ROW
WHEN NEW.updated_at_s = OLD.updated_at_s
BEGIN
  UPDATE courses
     SET updated_at_s = unixepoch()
   WHERE rowid = NEW.rowid;
END;

CREATE INDEX IF NOT EXISTS idx_courses_school_name ON courses(school_id, name);

CREATE TABLE IF NOT EXISTS problems (
  id                      TEXT    PRIMARY KEY,
  course_id               TEXT    NOT NULL,
  slug                    TEXT    NOT NULL CHECK   (slug GLOB '[-a-z0-9]*' AND length(slug) BETWEEN 1 AND 64),
  name                    TEXT             CHECK   (name IS NULL OR length(name) BETWEEN 1 AND 64),
  description             TEXT             CHECK   (description IS NULL OR length(description) BETWEEN 1 AND 4096),
  language_limit          TEXT    NOT NULL CHECK   (json_valid(language_limit)),
  code_size_limit_byte    INTEGER NOT NULL CHECK   (code_size_limit_byte BETWEEN 1 AND 1048576),
  time_limit_ms           INTEGER NOT NULL CHECK   (time_limit_ms BETWEEN 1 AND 60000),
  memory_limit_byte       INTEGER NOT NULL CHECK   (memory_limit_byte BETWEEN 1 AND 1048576),
  artifact                TEXT             CHECK   (artifact IS NULL OR json_valid(artifact)),
  created_at_s            INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_s            INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  UNIQUE      (course_id, slug)
);

CREATE TRIGGER IF NOT EXISTS trg_problems_touch_updated_at
AFTER UPDATE ON problems
FOR EACH ROW
WHEN NEW.updated_at_s = OLD.updated_at_s
BEGIN
  UPDATE problems
     SET updated_at_s = unixepoch()
   WHERE rowid = NEW.rowid;
END;

CREATE INDEX IF NOT EXISTS idx_problems_course_name ON problems(course_id, name);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT    PRIMARY KEY,
  email         TEXT    NOT NULL COLLATE NOCASE UNIQUE CHECK (email LIKE '%_@_%._%' AND length(email) BETWEEN 4 AND 256),
  slug          TEXT    NOT NULL UNIQUE    CHECK (slug GLOB '[-a-z0-9]*' AND length(slug) BETWEEN 1 AND 64),
  name          TEXT                       CHECK (name IS NULL OR length(name) BETWEEN 1 AND 64),
  description   TEXT                       CHECK (description IS NULL OR length(description) BETWEEN 1 AND 4096),
  is_active     INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)),
  created_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_s  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TRIGGER IF NOT EXISTS trg_users_touch_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at_s = OLD.updated_at_s
BEGIN
  UPDATE users
     SET updated_at_s = unixepoch()
   WHERE rowid = NEW.rowid;
END;

CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id       TEXT    NOT NULL,
  type          TEXT    NOT NULL CHECK   (type IN ('password')),
  secret_hash   TEXT    NOT NULL,
  created_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at    INTEGER,

  PRIMARY KEY (user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS tokens (
  token         TEXT    PRIMARY KEY,
  email         TEXT    NOT NULL COLLATE NOCASE CHECK (email LIKE '%_@_%._%' AND length(email) BETWEEN 4 AND 256),
  purpose       TEXT    NOT NULL CHECK   (purpose IN ('login','verify_email','reauth','reset_password','change_email_old','change_email_new','invite','unsubscribe')),
  created_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at_s  INTEGER NOT NULL DEFAULT (unixepoch()),
  consumed_at_s INTEGER
) WITHOUT ROWID;

CREATE        INDEX IF NOT EXISTS idx_tokens_email   ON tokens(email);
CREATE        INDEX IF NOT EXISTS idx_tokens_expires ON tokens(expires_at_s);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_active  ON tokens(email, purpose) WHERE consumed_at_s IS NULL AND purpose IN ('login','verify_email','reauth','reset_password','change_email_old','change_email_new');

CREATE TABLE IF NOT EXISTS submissions (
  id                TEXT    PRIMARY KEY,
  user_id           TEXT    NOT NULL,
  problem_id        TEXT    NOT NULL,
  status            TEXT    NOT NULL CHECK   (status IN ('IQ','IJ','AC','WA','TLE','MLE','RE','CE','OLE','RF','SLE','SE','IE','UE','CJ')),
  language          TEXT    NOT NULL,
  code              TEXT    NOT NULL,
  code_size_byte    INTEGER NOT NULL CHECK   (code_size_byte BETWEEN 1 AND 1048576),
  run_time_ms       INTEGER          CHECK   (run_time_ms BETWEEN 1 AND 60000),
  run_memory_byte   INTEGER          CHECK   (run_memory_byte BETWEEN 1 AND 1048576),
  artifact          TEXT             CHECK   (artifact IS NULL OR json_valid(artifact)),
  created_at_s      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_s      INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE RESTRICT,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_submissions_touch_updated_at
AFTER UPDATE ON submissions
FOR EACH ROW
WHEN NEW.updated_at_s = OLD.updated_at_s
BEGIN
  UPDATE submissions
     SET updated_at_s = unixepoch()
   WHERE rowid = NEW.rowid;
END;

CREATE INDEX IF NOT EXISTS idx_submissions_user_created    ON submissions(user_id, created_at_s DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_created ON submissions(problem_id, created_at_s DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_open_status     ON submissions(status) WHERE status IN ('IQ','IJ'); 