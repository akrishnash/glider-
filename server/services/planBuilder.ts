import { eq, and } from "drizzle-orm";
import { db, users, profiles, preferences, jobs, resumes } from "../db/index.js";
import type { ApplicationPlan } from "./goalBuilder.js";

export interface PlanInput {
  userId: string;
  jobId: string;
  resumeFileKey?: string | null;
  baseUrl: string;
}

/**
 * Build ApplicationPlan from user profile, preferences, latest resume, and job.
 */
export function buildPlan(input: PlanInput): ApplicationPlan | null {
  const { userId, jobId, resumeFileKey, baseUrl } = input;

  const user = db.select().from(users).where(eq(users.id, userId)).limit(1).get();
  if (!user) return null;

  const profile = db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).get();
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).get();
  if (!job) return null;

  let resumeExtract: typeof resumes.$inferSelect.extract = null;
  if (resumeFileKey) {
    const resumeRow = db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.fileKey, resumeFileKey)))
      .limit(1)
      .get();
    resumeExtract = resumeRow?.extract ?? null;
  }

  // Prefer profile over resume extract when user has set profile fields (Profile tab edits are used first).
  const fullName = profile?.fullName?.trim() || resumeExtract?.name || "";
  const phone = profile?.phone?.trim() || resumeExtract?.phone || "";
  const location = profile?.location ?? "";
  const address = profile?.address?.trim() || resumeExtract?.address || undefined;
  const dateOfBirth = profile?.dateOfBirth ?? undefined;
  const email = user.email;

  const plan: ApplicationPlan = {
    personal: {
      full_name: fullName?.trim() || "Candidate",
      email,
      phone,
      location,
      address,
      date_of_birth: dateOfBirth,
      linkedin_url: profile?.linkedinUrl ?? undefined,
      portfolio_url: profile?.portfolioUrl ?? undefined,
    },
    answers: {},
  };

  if (resumeExtract?.education && resumeExtract.education.length > 0) {
    plan.education = resumeExtract.education.map((e) => ({
      degree: e.degree,
      school: e.school,
      year: e.year,
    }));
  }

  if (resumeFileKey && baseUrl) {
    plan.resume_url = `${baseUrl}/api/resumes/file/${resumeFileKey}`;
  }

  const role = job.jobTitle ?? "this role";
  const company = job.companyName ?? "the company";
  plan.answers["Why are you interested in this role?"] =
    profile?.summary ?? `I am excited to apply for ${role} at ${company} and believe my experience aligns well with the position.`;
  plan.answers["Why do you want to work here?"] =
    `I'm drawn to ${company}'s mission and would love to contribute to the team.`;
  plan.answers["How did you hear about us?"] = "Company website / job board";

  return plan;
}
