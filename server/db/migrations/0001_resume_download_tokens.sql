CREATE TABLE IF NOT EXISTS `resume_download_tokens` (
  `token` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `file_key` text NOT NULL,
  `expires_at` integer NOT NULL
);
