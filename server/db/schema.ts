import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  summary: text("summary"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
});

export const preferences = sqliteTable("preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roles: text("roles", { mode: "json" }).$type<string[]>().default([]),
  techStack: text("tech_stack", { mode: "json" }).$type<string[]>().default([]),
  locations: text("locations", { mode: "json" }).$type<string[]>().default([]),
  minSalary: integer("min_salary"),
  companyTypes: text("company_types", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type Platform = "greenhouse" | "workday" | "lever" | "linkedin";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull().unique(),
  platform: text("platform", { enum: ["greenhouse", "workday", "lever", "linkedin"] }).notNull(),
  companyName: text("company_name"),
  jobTitle: text("job_title"),
  rawDescription: text("raw_description"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type ApplicationStatus =
  | "pending"
  | "running"
  | "submitted"
  | "failed"
  | "manual_review";

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "running", "submitted", "failed", "manual_review"],
  }).notNull().default("pending"),
  runId: text("run_id"),
  planSnapshot: text("plan_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const answerTemplates = sqliteTable("answer_templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionType: text("question_type").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const resumeDownloadTokens = sqliteTable("resume_download_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
