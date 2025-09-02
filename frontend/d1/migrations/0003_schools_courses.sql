CREATE TABLE IF NOT EXISTS schools (
  school_id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  course_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(school_id),
  name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id);