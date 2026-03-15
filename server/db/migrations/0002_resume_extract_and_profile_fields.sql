-- Add address and date_of_birth to profiles
ALTER TABLE `profiles` ADD COLUMN `address` text;
ALTER TABLE `profiles` ADD COLUMN `date_of_birth` text;

-- Add extract JSON to resumes
ALTER TABLE `resumes` ADD COLUMN `extract` text;
