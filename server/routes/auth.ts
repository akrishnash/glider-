import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { db, users, profiles, preferences } from "../db/index.js";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, type JwtPayload } from "../middleware/auth.js";

const router = Router();

const DEMO_EMAIL = "demo@glider.local";
const DEMO_PASSWORD = "demo12345";

router.post("/demo", async (req: Request, res: Response) => {
  const existing = db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1).all();
  let id: string;
  if (existing.length > 0) {
    id = existing[0]!.id;
  } else {
    id = uuid();
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    db.insert(users).values({ id, email: DEMO_EMAIL, passwordHash, createdAt: now, updatedAt: now }).run();
    db.insert(profiles).values({ id: uuid(), userId: id, createdAt: now, updatedAt: now }).run();
    db.insert(preferences).values({ id: uuid(), userId: id, createdAt: now, updatedAt: now }).run();
  }
  const token = signToken({ userId: id, email: DEMO_EMAIL });
  res.json({ token, user: { id, email: DEMO_EMAIL } });
});

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "email and password required" } });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "password must be at least 8 characters" } });
    return;
  }
  const existing = db.select().from(users).where(eq(users.email, email)).limit(1).all();
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "CONFLICT", message: "Email already registered" } });
    return;
  }
  const id = uuid();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);
  db.insert(users).values({
    id,
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt: now,
    updatedAt: now,
  }).run();
  const profileId = uuid();
  db.insert(profiles).values({
    id: profileId,
    userId: id,
    createdAt: now,
    updatedAt: now,
  }).run();
  const prefsId = uuid();
  db.insert(preferences).values({
    id: prefsId,
    userId: id,
    createdAt: now,
    updatedAt: now,
  }).run();
  const token = signToken({ userId: id, email: email.trim().toLowerCase() });
  res.status(201).json({ token, user: { id, email: email.trim().toLowerCase() } });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "email and password required" } });
    return;
  }
  const user = db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1).get();
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } });
    return;
  }
  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email } });
});

router.get("/me", authMiddleware, (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const u = db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, user.userId)).limit(1).get();
  if (!u) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }
  res.json({ user: u });
});

export default router;
