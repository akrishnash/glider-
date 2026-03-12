# Glider

Autonomous job application agent for the TinyFish accelerator. Glider uses the TinyFish API to navigate, reason, and fill out job forms (Workday, Greenhouse, Lever, LinkedIn) automatically.

## Quick start

1. **Copy env and set your TinyFish API key**
   ```bash
   cp .env.example .env
   # Edit .env and set TINYFISH_API_KEY to your key.
   ```

2. **Install and run migrations**
   ```bash
   npm install
   npm run db:migrate
   ```

3. **Start dev server (API + frontend)**
   ```bash
   npm run dev
   ```
   - API: http://localhost:3000  
   - Dashboard: http://localhost:5173  

4. **Use the app**
   - Sign up, then open **Profile**: set name, contact, LinkedIn, upload a resume, save preferences.
   - Open **Jobs**: paste Greenhouse (or other) job URLs, one per line, click **Ingest**.
   - Click **Glide** on a job to run the TinyFish agent. Status appears under **Applications** (polls every 15s).

## Docs (in `/docs`)

| Doc | Purpose |
|-----|--------|
| [DATA_MODEL_AND_API.md](docs/DATA_MODEL_AND_API.md) | Data model, API routes, TinyFish task schema |
| [TINYFISH_GREENHOUSE_SPEC.md](docs/TINYFISH_GREENHOUSE_SPEC.md) | TinyFish agent task spec for Greenhouse |
| [ACCELERATOR_APPLICATION.md](docs/ACCELERATOR_APPLICATION.md) | Accelerator application outline |

## Scripts

- `npm run dev` – run API + Vite dev server
- `npm run dev:server` – API only (port 3000)
- `npm run dev:client` – Vite only (port 5173)
- `npm run db:migrate` – run DB migrations (SQLite under `./data/glider.db`)
- `npm run build` – build server + client

## Troubleshooting

**Port 3000 already in use**  
The server will try 3000, then 3001, 3002, etc. If it starts on another port, the Vite proxy may still point at 3000. Either free port 3000 with `npx kill-port 3000` then restart, or in `vite.config.ts` set the proxy target to the port the server printed.

**Application status "failed"**  
The TinyFish run may have failed (e.g. captcha, form change). Retry by clicking Glide again on the same job.

## Credits

Uses [TinyFish Web Agent](https://docs.tinyfish.ai/) for browser automation. Set `TINYFISH_API_KEY` in `.env` (e.g. ~16k credits with API access).
# glider-
