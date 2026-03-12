/**
 * Build a short natural-language goal for TinyFish to fill a Greenhouse job application.
 * Kept minimal to reduce token/credit use per run.
 */
export interface ApplicationPlan {
  personal: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin_url?: string;
    portfolio_url?: string;
  };
  resume_url?: string;
  cover_letter_url?: string;
  answers: Record<string, string>;
}

export function buildGreenhouseGoal(plan: ApplicationPlan): string {
  const p = plan.personal;
  const [first = "", ...rest] = (p.full_name || "").trim().split(/\s+/);
  const last = rest.join(" ") || "";

  const answerEntries = Object.entries(plan.answers);

  const lines: string[] = [
    "You are on a Greenhouse job posting page and must fill the application form accurately.",
    "",
    "Rules:",
    "- Do NOT click the final Submit button. Stop at the final review step with the form filled.",
    "- If a cookie banner appears, dismiss it.",
    "- If a CAPTCHA/hCaptcha/recaptcha appears, stop and report blocked.",
    "- If required fields are missing, do not guess. Report missing required fields.",
    "",
    "Steps:",
    "1) Click 'Apply' or 'Apply for this job' to open the application form.",
    "2) Scan the form and identify all visible input/select/textarea fields. For each field capture: label text, type, and whether it's required.",
    "3) Fill the form with these values (match by field label/aria-label/placeholder):",
    `- First name: ${first || ""}`,
    `- Last name: ${last || ""}`,
    `- Email: ${p.email || ""}`,
    `- Phone: ${p.phone || ""}`,
    `- Location: ${p.location || ""}`,
  ];

  if (p.linkedin_url) lines.push(`- LinkedIn URL: ${p.linkedin_url}`);
  if (p.portfolio_url) lines.push(`- Portfolio/Website: ${p.portfolio_url}`);

  lines.push("");
  if (plan.resume_url) {
    lines.push("4) Resume upload: download the file from this URL and upload into the resume/CV file input:", plan.resume_url);
    lines.push("   After uploading, confirm the page shows the resume is attached (e.g. filename visible or attachment indicator).");
  } else {
    lines.push("4) Resume upload: if resume is required and missing, report it as missing_required.");
  }

  if (plan.cover_letter_url) {
    lines.push("");
    lines.push("5) Cover letter upload (if field exists): download and upload from:", plan.cover_letter_url);
  }

  if (answerEntries.length > 0) {
    lines.push("");
    lines.push("6) Additional questions: fill these by matching question text/label:");
    for (const [label, value] of answerEntries) {
      lines.push(`- \"${label}\": ${value}`);
    }
  }

  lines.push("");
  lines.push("7) If there are any validation errors shown on the page (red text, 'required', etc.), collect them.");
  lines.push("8) When you are at the final step and the Submit button is visible, STOP (do not click submit).");
  lines.push("");
  lines.push("Return a single JSON object ONLY (no extra text) with this schema:");
  lines.push("{");
  lines.push("  \"status\": \"success\" | \"needs_input\" | \"blocked\" | \"failure\",");
  lines.push("  \"filled_fields\": [{\"label\": string, \"value_preview\": string}],");
  lines.push("  \"missing_required\": [{\"label\": string, \"selector_hint\": string}],");
  lines.push("  \"validation_errors\": string[],");
  lines.push("  \"captcha_detected\": boolean,");
  lines.push("  \"at_submit_step\": boolean,");
  lines.push("  \"resume_attached\": boolean");
  lines.push("}");
  lines.push("");
  lines.push("Interpretation:");
  lines.push("- status=success if all required fields are filled, resume_attached=true (if required), captcha_detected=false, at_submit_step=true, and validation_errors is empty.");
  lines.push("- status=needs_input if missing_required is non-empty or validation_errors exist.");
  lines.push("- status=blocked if captcha_detected=true.");
  lines.push("- status=failure if you cannot find the application form or cannot upload resume when required.");

  return lines.join("\n");
}

export function detectPlatformFromUrl(url: string): "greenhouse" | "workday" | "lever" | "linkedin" {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io")) return "greenhouse";
  if (u.includes("workday.com") || u.includes("myworkdayjobs.com")) return "workday";
  if (u.includes("lever.co") || u.includes("jobs.lever.co")) return "lever";
  if (u.includes("linkedin.com")) return "linkedin";
  return "greenhouse";
}
