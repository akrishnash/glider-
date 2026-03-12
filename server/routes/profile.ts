import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db, profiles } from "../db/index.js";
import { eq } from "drizzle-orm";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const p = db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1).get();
  if (!p) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Profile not found" } });
    return;
  }
  res.json({
    profile: {
      id: p.id,
      full_name: p.fullName,
      phone: p.phone,
      location: p.location,
      linkedin_url: p.linkedinUrl,
      portfolio_url: p.portfolioUrl,
      summary: p.summary,
    },
  });
});

router.put("/", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const body = req.body as Record<string, unknown>;
  const existing = db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1).get();
  const now = new Date();
  if (!existing) {
    const id = uuid();
    db.insert(profiles).values({
      id,
      userId: user.userId,
      fullName: (body.full_name as string) ?? null,
      phone: (body.phone as string) ?? null,
      location: (body.location as string) ?? null,
      linkedinUrl: (body.linkedin_url as string) ?? null,
      portfolioUrl: (body.portfolio_url as string) ?? null,
      summary: (body.summary as string) ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();
    res.json({ profile: { id, full_name: body.full_name, phone: body.phone, location: body.location, linkedin_url: body.linkedin_url, portfolio_url: body.portfolio_url, summary: body.summary } });
    return;
  }
  db.update(profiles)
    .set({
      fullName: (body.full_name as string) ?? existing.fullName,
      phone: (body.phone as string) ?? existing.phone,
      location: (body.location as string) ?? existing.location,
      linkedinUrl: (body.linkedin_url as string) ?? existing.linkedinUrl,
      portfolioUrl: (body.portfolio_url as string) ?? existing.portfolioUrl,
      summary: (body.summary as string) ?? existing.summary,
      updatedAt: now,
    })
    .where(eq(profiles.id, existing.id))
    .run();
  const updated = db.select().from(profiles).where(eq(profiles.id, existing.id)).limit(1).get();
  res.json({
    profile: updated ? {
      id: updated.id,
      full_name: updated.fullName,
      phone: updated.phone,
      location: updated.location,
      linkedin_url: updated.linkedinUrl,
      portfolio_url: updated.portfolioUrl,
      summary: updated.summary,
    } : {},
  });
});

export default router;
