import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db, preferences } from "../db/index.js";
import { eq } from "drizzle-orm";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const p = db.select().from(preferences).where(eq(preferences.userId, user.userId)).limit(1).get();
  if (!p) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Preferences not found" } });
    return;
  }
  res.json({
    preferences: {
      roles: p.roles ?? [],
      tech_stack: p.techStack ?? [],
      locations: p.locations ?? [],
      min_salary: p.minSalary ?? null,
      company_types: p.companyTypes ?? [],
    },
  });
});

router.put("/", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const body = req.body as Record<string, unknown>;
  const existing = db.select().from(preferences).where(eq(preferences.userId, user.userId)).limit(1).get();
  const now = new Date();
  const roles = Array.isArray(body.roles) ? body.roles as string[] : existing?.roles ?? [];
  const techStack = Array.isArray(body.tech_stack) ? body.tech_stack as string[] : existing?.techStack ?? [];
  const locations = Array.isArray(body.locations) ? body.locations as string[] : existing?.locations ?? [];
  const minSalary = typeof body.min_salary === "number" ? body.min_salary : (body.min_salary === null ? null : existing?.minSalary ?? null);
  const companyTypes = Array.isArray(body.company_types) ? body.company_types as string[] : existing?.companyTypes ?? [];

  if (!existing) {
    const id = uuid();
    db.insert(preferences).values({
      id,
      userId: user.userId,
      roles,
      techStack,
      locations,
      minSalary,
      companyTypes,
      createdAt: now,
      updatedAt: now,
    }).run();
    res.json({ preferences: { roles, tech_stack: techStack, locations, min_salary: minSalary, company_types: companyTypes } });
    return;
  }
  db.update(preferences)
    .set({ roles, techStack, locations, minSalary, companyTypes, updatedAt: now })
    .where(eq(preferences.id, existing.id))
    .run();
  res.json({ preferences: { roles, tech_stack: techStack, locations, min_salary: minSalary, company_types: companyTypes } });
});

export default router;
