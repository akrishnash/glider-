# Glider – TinyFish Accelerator Application (1–2 Page Outline)

Use this as the skeleton for your written application. Fill in the bracketed parts with your details.

---

## 1. Problem (2–3 short paragraphs)

**The bottleneck:** Skilled candidates spend hours every week on repetitive, low-leverage work: searching job boards, re-entering the same information into Workday, Greenhouse, Lever, and LinkedIn, and tailoring answers to nearly identical questions. Many give up halfway; high-fit roles are missed simply because applying is tedious.

**Current tools fall short:** Existing solutions are either spammy (mass apply with little regard to fit or quality) or only assist with basic auto-fill. They don’t *reason* about fit, handle multi-step flows, or answer company-specific and behavioral questions in a coherent way.

**Why it matters:** Hiring is concentrated on a handful of ATS platforms. Automating the application flow end-to-end—while keeping quality and relevance high—would give candidates back their time and increase the number of well-matched applications in the pipeline.

---

## 2. Solution: Glider (2 paragraphs)

**What Glider is:** Glider is an autonomous job application agent. Users define their goals and constraints (roles, tech stack, location, salary, company type). Glider then discovers roles, evaluates fit, and fills out applications on major platforms (Workday, Greenhouse, Lever, LinkedIn) automatically—using the TinyFish API to navigate, reason, and complete forms like a human would.

**How it’s different:** We focus on *autopilot with quality*: the user approves strategy and profile, not every single form. Glider uses an LLM to match jobs to the candidate and to generate consistent, tailored answers. The agent runs in a real browser via TinyFish, so it works on complex, JavaScript-heavy ATS pages without fragile selectors or brittle APIs.

---

## 3. Why TinyFish (1 short paragraph)

TinyFish provides the browser-native agent layer we need to reliably click, scroll, read, and fill forms across Workday, Greenhouse, Lever, and LinkedIn. Building this ourselves would mean months of handling captchas, layout changes, and platform quirks. By building on TinyFish, we can focus on candidate experience, fit logic, and answer quality—and ship a working autopilot in the timeframe of the accelerator.

---

## 4. Why Us (1 short paragraph)

[Your background: e.g. full-stack engineer, experience with automation or hiring tools, previous projects. One line on why you’re committed to this problem and to shipping during the program.]

---

## 5. Roadmap (bullet list)

- **Weeks 1–2:** User onboarding (profile, resume, preferences), job ingestion from URLs, and first TinyFish integration for **Greenhouse** (see TINYFISH_GREENHOUSE_SPEC.md).
- **Weeks 3–4:** Fit scoring (LLM), answer generation from profile + templates, dashboard with application log and status. Add **Workday** support.
- **Weeks 5–6:** Polish UX (“Glide now” flow, live log or screenshot gallery), error handling and manual-review path, demo-ready autopilot applying to 5–20 curated roles.
- **Post-accelerator:** Autosourcing (crawl Greenhouse/Workday/LinkedIn), multi-user SaaS, optional human-in-the-loop approval before submit.

---

## 6. Ask (1–2 sentences)

[What you want from the accelerator: e.g. TinyFish API access, design feedback, intro to hiring/HR beta users, support with compliance/privacy for resume data.]

---

**Keep the full narrative to 1–2 pages.** Use this outline as-is and drop in your “Why us” and “Ask” to make it your own.
