import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import preferencesRoutes from "./routes/preferences.js";
import resumesRoutes from "./routes/resumes.js";
import jobsRoutes from "./routes/jobs.js";
import applicationsRoutes from "./routes/applications.js";
import { startPolling } from "./services/pollWorker.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/resumes", resumesRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/applications", applicationsRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Express error", err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

startPolling();

const desiredPort = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== "production";
const maxAttempts = isDev ? 1 : 5;

function tryListen(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log("Glider API listening on http://localhost:" + port);
      if (port !== desiredPort) {
        console.log("(Port " + desiredPort + " was in use. Update vite.config.ts proxy target to http://localhost:" + port + " if the app can't connect.)");
      }
      resolve();
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      server.close();
      if (err.code === "EADDRINUSE") reject(err);
      else reject(err);
    });
  });
}

(async () => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = desiredPort + i;
    try {
      await tryListen(port);
      break;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "EADDRINUSE" && i < maxAttempts - 1) {
        console.warn("Port " + port + " in use, trying " + (port + 1) + "...");
      } else {
        if (isDev) {
          console.error("Port " + desiredPort + " is in use. Stop the other process using it (e.g. another npm run dev) and try again.");
        } else {
          console.error("Could not start server:", e.message);
        }
        process.exit(1);
      }
    }
  }
})();

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at", promise, "reason", reason);
});
