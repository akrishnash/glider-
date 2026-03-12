import { db, applications } from "../db/index.js";
import { getRunStatus } from "./tinyfish.js";
import { eq, and, isNotNull } from "drizzle-orm";

const POLL_INTERVAL_MS = 15_000;

function getRunningApplications(): { id: string; runId: string | null }[] {
  try {
    const rows = db
      .select({ id: applications.id, runId: applications.runId })
      .from(applications)
      .where(and(eq(applications.status, "running"), isNotNull(applications.runId)))
      .limit(100)
      .all();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("Poll worker query error", err);
    return [];
  }
}

export function startPolling() {
  setInterval(() => {
    try {
      const list = getRunningApplications();
      for (const row of list) {
        const runId = row.runId;
        const applicationId = row.id;
        if (!runId) continue;
        getRunStatus(runId)
          .then((run) => {
            // Even while RUNNING/PENDING, store streamingUrl if available
            if (run.status === "RUNNING" || run.status === "PENDING") {
              if (run.streamingUrl) {
                db.update(applications)
                  .set({
                    result: {
                      run_id: runId,
                      status: run.status,
                      streamingUrl: run.streamingUrl,
                    },
                    updatedAt: new Date(),
                  })
                  .where(eq(applications.id, applicationId))
                  .run();
              }
              return;
            }
            const result: Record<string, unknown> = {
              run_id: runId,
              status: run.status,
              result: run.result,
              error: run.error,
              streamingUrl: run.streamingUrl,
            };
            let newStatus: "failed" | "manual_review" = "failed";
            let submittedAt: Date | null = null;
            if (run.status === "COMPLETED" && run.result) {
              // Interpret the structured JSON contract from buildGreenhouseGoal()
              const r = run.result as any;
              const goalStatus = r?.status as string | undefined;
              if (goalStatus === "failure") {
                result.error = r?.reason ?? "Goal failure";
                newStatus = "failed";
              } else if (goalStatus === "blocked") {
                result.error = "Blocked (captcha)";
                newStatus = "manual_review";
              } else if (goalStatus === "needs_input") {
                result.error = "Needs input";
                newStatus = "manual_review";
              } else if (goalStatus === "success") {
                // We never auto-submit; success means filled + ready for submit.
                newStatus = "manual_review";
              } else {
                // Unknown shape: do not claim submitted.
                newStatus = "manual_review";
              }
            } else if (run.status === "FAILED") {
              result.error = run.error?.message ?? "Run failed";
            } else if (run.status === "CANCELLED") {
              result.error = "Run was cancelled";
            }
            db.update(applications)
              .set({ status: newStatus, result, submittedAt, updatedAt: new Date() })
              .where(eq(applications.id, applicationId))
              .run();
          })
          .catch((err) => console.error("Poll error for run", runId, err));
      }
    } catch (err) {
      console.error("Poll worker tick error", err);
    }
  }, POLL_INTERVAL_MS);
  console.log("TinyFish poll worker started (interval %ds)", POLL_INTERVAL_MS / 1000);
}
