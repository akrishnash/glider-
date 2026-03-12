# Glider – Data Model & API Design

## 1. Data Model (PostgreSQL-friendly)

### Core entities

```
users
  id (uuid, PK)
  email (unique)
  password_hash
  created_at
  updated_at

profiles
  id (uuid, PK)
  user_id (FK → users)
  full_name
  phone
  location
  linkedin_url
  portfolio_url
  summary (text)
  created_at
  updated_at

resumes
  id (uuid, PK)
  user_id (FK → users)
  file_key (S3/storage path)
  file_name
  uploaded_at

preferences
  id (uuid, PK)
  user_id (FK → users)
  roles (text[])           -- e.g. ["Software Engineer", "Full Stack"]
  tech_stack (text[])      -- e.g. ["React", "Node.js"]
  locations (text[])       -- e.g. ["Remote", "NYC"]
  min_salary (int, nullable)
  company_types (text[])   -- e.g. ["startup", "series_b"]
  created_at
  updated_at

jobs
  id (uuid, PK)
  source_url (text)        -- canonical job posting URL
  platform (enum: greenhouse | workday | lever | linkedin)
  company_name
  job_title
  raw_description (text)   -- scraped JD
  metadata (jsonb)         -- salary range, location, etc.
  discovered_at
  created_at

applications
  id (uuid, PK)
  user_id (FK → users)
  job_id (FK → jobs)
  status (enum: pending | running | submitted | failed | manual_review)
  plan_snapshot (jsonb)    -- ApplicationPlan sent to TinyFish
  result (jsonb)           -- TinyFish response, errors, screenshots
  submitted_at (nullable)
  created_at
  updated_at

answer_templates
  id (uuid, PK)
  user_id (FK → users)
  question_type (e.g. "why_company", "behavioral_star")
  content (text)
  created_at
  updated_at
```

### Enums

- `platform`: `greenhouse` | `workday` | `lever` | `linkedin`
- `application_status`: `pending` | `running` | `submitted` | `failed` | `manual_review`

---

## 2. API Routes

### Auth
- `POST /api/auth/register` – body: `{ email, password }`
- `POST /api/auth/login` – body: `{ email, password }` → returns JWT
- `GET /api/auth/me` – returns current user (requires JWT)

### Profile & onboarding
- `GET /api/profile` – get current user’s profile
- `PUT /api/profile` – update profile (full_name, phone, location, linkedin_url, summary, etc.)
- `POST /api/resumes` – multipart upload → returns `{ id, file_key, file_name }`
- `GET /api/preferences` – get preferences
- `PUT /api/preferences` – update preferences (roles, tech_stack, locations, min_salary, company_types)
- `GET /api/answer-templates` – list templates
- `POST /api/answer-templates` – create template
- `PUT /api/answer-templates/:id` – update template
- `DELETE /api/answer-templates/:id` – delete template

### Jobs
- `POST /api/jobs/ingest` – body: `{ urls: string[] }` – create/update jobs from URLs (optional scrape via TinyFish)
- `GET /api/jobs` – query: `?platform=&status=open&limit=50` – list jobs (for dashboard)
- `GET /api/jobs/:id` – job detail + applications for current user

### Applications (Glider runs)
- `POST /api/applications/plan` – body: `{ job_id }` – returns `ApplicationPlan` (for preview, no submit)
- `POST /api/applications/run` – body: `{ job_id }` or `{ job_ids: string[] }` – enqueue TinyFish run(s)
- `GET /api/applications` – query: `?status=&job_id=&limit=50` – list applications
- `GET /api/applications/:id` – application detail + plan_snapshot + result
- `PATCH /api/applications/:id` – e.g. set status to `manual_review` or retry

### TinyFish integration (internal / webhook)
- `POST /api/agent/callback` – TinyFish completion webhook: `{ task_id, success, result, error, screenshots? }`

---

## 3. TinyFish Task Schema (application run)

Payload sent to TinyFish when starting an application:

```json
{
  "task_type": "job_application",
  "platform": "greenhouse",
  "job_url": "https://boards.greenhouse.io/company/jobs/123",
  "plan": {
    "personal": {
      "full_name": "...",
      "email": "...",
      "phone": "...",
      "location": "...",
      "linkedin_url": "...",
      "portfolio_url": "..."
    },
    "resume_url": "https://your-cdn.com/presigned-resume.pdf",
    "cover_letter_url": "https://your-cdn.com/presigned-cover.pdf",
    "answers": {
      "question_id_or_label_1": "Generated or template answer 1",
      "question_id_or_label_2": "Answer 2"
    },
    "additional_documents": []
  },
  "callback_url": "https://your-api.com/api/agent/callback",
  "metadata": {
    "application_id": "uuid",
    "user_id": "uuid"
  }
}
```

Response stored in `applications.result`:

```json
{
  "success": true,
  "submitted_at": "ISO8601",
  "screenshots": ["url1", "url2"],
  "steps_log": [
    { "step": "navigate", "ok": true },
    { "step": "fill_personal", "ok": true },
    { "step": "upload_resume", "ok": true },
    { "step": "submit", "ok": true }
  ],
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "error": "Could not find submit button",
  "step_failed": "submit",
  "screenshots": ["url_last"],
  "steps_log": [...]
}
```

---

## 4. ApplicationPlan (built by backend before calling TinyFish)

- Load user profile, resume URL (presigned), preferences.
- Load job (title, company, JD).
- Generate or select answers for known question types (LLM + templates).
- Build `plan` object and attach to `applications.plan_snapshot`.
- Send to TinyFish with `job_url`, `platform`, `callback_url`, `metadata.application_id`.

This document is the single source of truth for the data model, API surface, and TinyFish contract.
