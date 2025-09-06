# sql-schema

## users
- `user_id` TEXT PK
- `email` TEXT UNIQUE NOT NULL
- `created_at` TEXT NOT NULL

## magic_tokens
- `token` TEXT PK
- `email` TEXT NOT NULL
- `expires_at` INTEGER NOT NULL

## schools
- `school_id` TEXT PK  (ROR ID)
- `name` TEXT NOT NULL

## courses
- `course_id` TEXT PK  (official course code)
- `school_id` TEXT NOT NULL FK -> schools
- `name` TEXT NOT NULL

## problems
- `problem_id` TEXT PK
- `course_id` TEXT NOT NULL FK -> courses
- `title` TEXT NOT NULL
- `description` TEXT

## submissions
- `submission_id` TEXT PK
- `user_id` TEXT NOT NULL FK -> users
- `problem_id` TEXT NOT NULL FK -> problems
- `code` TEXT NOT NULL
- `status` TEXT NOT NULL  -- queued, running, accepted, wrong_answer
- `created_at` INTEGER NOT NULL

Indexes:
- `idx_submissions_user_created` (user_id, created_at DESC)
- `idx_submissions_problem` (problem_id)