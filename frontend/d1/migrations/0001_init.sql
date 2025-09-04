PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token       TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);

CREATE TABLE IF NOT EXISTS schools (
  school_id TEXT PRIMARY KEY,
  name      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  course_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name      TEXT NOT NULL,
  FOREIGN KEY (school_id) REFERENCES schools(school_id)
);
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);

CREATE TABLE IF NOT EXISTS problems (
  problem_id   TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT
);
CREATE INDEX IF NOT EXISTS idx_problems_title ON problems(title);

CREATE TABLE IF NOT EXISTS course_problems (
  course_id  TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  ordinal    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, problem_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
);
CREATE INDEX IF NOT EXISTS idx_course_problems_course_ordinal ON course_problems(course_id, ordinal);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  problem_id    TEXT NOT NULL,
  code          TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
