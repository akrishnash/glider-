-- Glider schema
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `full_name` text,
  `phone` text,
  `location` text,
  `linkedin_url` text,
  `portfolio_url` text,
  `summary` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `resumes` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `file_key` text NOT NULL,
  `file_name` text NOT NULL,
  `uploaded_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `preferences` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `roles` text DEFAULT '[]',
  `tech_stack` text DEFAULT '[]',
  `locations` text DEFAULT '[]',
  `min_salary` integer,
  `company_types` text DEFAULT '[]',
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `source_url` text NOT NULL UNIQUE,
  `platform` text NOT NULL,
  `company_name` text,
  `job_title` text,
  `raw_description` text,
  `metadata` text,
  `discovered_at` integer NOT NULL,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `applications` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `job_id` text NOT NULL REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  `status` text NOT NULL DEFAULT 'pending',
  `run_id` text,
  `plan_snapshot` text,
  `result` text,
  `submitted_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `answer_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `question_type` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `profiles_user_id_idx` ON `profiles` (`user_id`);
CREATE INDEX IF NOT EXISTS `resumes_user_id_idx` ON `resumes` (`user_id`);
CREATE INDEX IF NOT EXISTS `preferences_user_id_idx` ON `preferences` (`user_id`);
CREATE INDEX IF NOT EXISTS `applications_user_id_idx` ON `applications` (`user_id`);
CREATE INDEX IF NOT EXISTS `applications_job_id_idx` ON `applications` (`job_id`);
CREATE INDEX IF NOT EXISTS `applications_run_id_idx` ON `applications` (`run_id`);
CREATE INDEX IF NOT EXISTS `answer_templates_user_id_idx` ON `answer_templates` (`user_id`);
