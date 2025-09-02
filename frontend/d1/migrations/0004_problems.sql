CREATE TABLE IF NOT EXISTS problems (
  problem_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS course_problems (
  course_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, problem_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  FOREIGN KEY (problem_id) REFERENCES problems(problem_id)
);

CREATE INDEX IF NOT EXISTS idx_course_problems_course ON course_problems(course_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_course_problems_problem ON course_problems(problem_id);
