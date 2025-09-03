INSERT OR IGNORE INTO schools (school_id, name) VALUES ('unitn', 'University of Trento');

INSERT OR IGNORE INTO courses (course_id, school_id, name)
VALUES ('CP1', 'unitn', 'Computer Programming 1');

INSERT OR IGNORE INTO problems (problem_id, title, description)
VALUES ('hello', 'Hello World', 'Print Hello, World.');

INSERT OR IGNORE INTO course_problems (course_id, problem_id, ordinal)
VALUES ('CP1', 'hello', 1);