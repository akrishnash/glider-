# TinyFish Agent Task Spec: Greenhouse

## Purpose

This spec defines how the Glider backend should invoke the TinyFish API to complete a **Greenhouse** job application end-to-end. Use it to implement the agent runner and to configure TinyFish tasks.

---

## 1. Greenhouse UX overview

- User lands on a job posting page, e.g. `https://boards.greenhouse.io/<company>/jobs/<job_id>`.
- "Apply" (or similar) opens the application form (often same page or a modal).
- Typical sections:
  - **Personal**: First name, Last name, Email, Phone, Location, LinkedIn, Portfolio/Website, Resume upload, Cover letter upload (optional).
  - **Questions**: Short text, long text, dropdown, yes/no, file upload. Questions may be required or optional.
- Submit button at the bottom; sometimes there is a captcha or additional consent step.

---

## 2. Task type and payload (align with DATA_MODEL_AND_API.md)

- **task_type**: `job_application`
- **platform**: `greenhouse`
- **job_url**: Full URL of the Greenhouse job posting (e.g. `https://boards.greenhouse.io/acme/jobs/12345`).
- **plan**: Object with `personal`, `resume_url`, `cover_letter_url`, `answers`, and optionally `additional_documents`.
- **callback_url**: Backend URL for completion webhook.
- **metadata**: At least `application_id` and `user_id` for idempotency and logging.

---

## 3. High-level steps for the agent

The TinyFish agent should perform these steps in order. Each step should be retryable and report success/failure for the steps_log.

1. **Navigate**
   - Open `job_url`.
   - Wait for page load (network idle or DOM ready).
   - Handle cookie/consent banners if present (dismiss or accept).

2. **Open application form**
   - Find and click the primary CTA: "Apply for this job", "Apply", or similar (data attributes or aria-labels often include "apply").
   - Wait for form to be visible (modal or inline form).

3. **Fill personal info**
   - Map `plan.personal` to visible fields:
     - first_name / First Name
     - last_name / Last Name
     - email / Email
     - phone / Phone
     - location / Location (or "City" / "Address" if single field)
     - linkedin_url / LinkedIn URL
     - portfolio_url / Portfolio, Website, or similar
   - Use robust selectors: `name`, `id`, `placeholder`, `aria-label`, or visible label text. Prefer stable attributes over brittle class names.

4. **Upload resume**
   - Locate file input for resume (often labeled "Resume", "CV", or "Attach resume").
   - If the platform accepts URL: some forms allow pasting a URL; otherwise use file download + local path if TinyFish supports file upload via path.
   - If file upload only: backend must provide a presigned URL; agent downloads the file to a temp path and uploads via the file input (TinyFish capability-dependent).

5. **Upload cover letter (optional)**
   - If `plan.cover_letter_url` is present and form has a cover letter / additional document field, upload similarly to resume.

6. **Answer custom questions**
   - For each key in `plan.answers`:
     - Match question by label text, placeholder, or question id (if present in DOM).
     - Field type can be: text, textarea, select, radio, checkbox.
     - Set value accordingly; for checkboxes/radio use boolean or option value.
   - If a question is not found, log and continue; optional questions can be skipped.

7. **Submit**
   - Scroll to submit button if needed.
   - Find button by text ("Submit", "Submit application", etc.) or by type submit.
   - Click and wait for navigation or success message (e.g. "Thank you for applying").
   - If a captcha or extra step appears, set `status: manual_review` and report in result (do not fail silently).

8. **Report**
   - Call `callback_url` with:
     - `success`: true if submission clearly succeeded; false otherwise.
     - `submitted_at`: ISO8601 when submit was clicked.
     - `steps_log`: array of step names and ok flag.
     - `error`, `step_failed`, `screenshots` as in DATA_MODEL_AND_API.md.

---

## 4. Selectors and robustness

- Prefer in order: `name`, `id`, `aria-label`, `placeholder`, then label association (e.g. `<label for="...">`).
- Greenhouse often uses consistent naming; keep a small mapping table (e.g. "First Name" → `plan.personal` first name) in backend or in agent config.
- For dynamic content, wait for selector visibility before filling.
- If multiple forms exist (e.g. login vs apply), ensure the apply form is in focus (e.g. by scoping to the modal or main form container).

---

## 5. Error handling

- **Network / timeout**: Retry once; then fail and report.
- **Element not found**: Log selector and step; fail step and report; set application status to `failed` or `manual_review`.
- **Validation error**: If the page shows inline validation (e.g. "Invalid email"), capture message in `result.error` and set `manual_review`.
- **Captcha / human check**: Do not attempt to solve; set `manual_review` and notify user.

---

## 6. Security and privacy

- Resume and cover letter must be served via short-lived presigned URLs.
- Do not log full `plan` contents in production logs; log only `application_id` and high-level status.
- TinyFish runs in a sandboxed browser context; ensure no sensitive tokens are passed except in callback payload to your backend.

---

## 7. Acceptance criteria for MVP

- [ ] Agent can open a Greenhouse job URL and open the application form.
- [ ] Agent fills all standard personal fields from `plan.personal`.
- [ ] Agent uploads resume (and optional cover letter) when URLs are provided.
- [ ] Agent fills at least 3 custom text/long-text questions from `plan.answers`.
- [ ] Agent clicks submit and correctly detects success or failure.
- [ ] Callback is sent to backend with `success`, `steps_log`, and `error` when applicable.
- [ ] Application record is updated (`submitted` or `failed` / `manual_review`) and user can see status in dashboard.

This spec is the contract for the first platform (Greenhouse); adapt the same structure for Workday, Lever, and LinkedIn in later iterations.
