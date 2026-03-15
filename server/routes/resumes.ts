import { Router, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { existsSync, createReadStream, mkdirSync } from "fs";
import { join } from "path";
import multer from "multer";
import { db, resumes, resumeDownloadTokens, profiles } from "../db/index.js";
import { eq } from "drizzle-orm";
import { authMiddleware, type JwtPayload } from "../middleware/auth.js";
import { extractAndParseResume } from "../services/resumeParser.js";

const router = Router();
const uploadsDir = join(process.cwd(), "data", "uploads");
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { user } = req as Request & { user: JwtPayload };
    const dir = join(uploadsDir, user!.userId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${uuid()}${file.originalname ? "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_") : ""}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/download", (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "token required" } });
    return;
  }
  const [row] = db.select().from(resumeDownloadTokens).where(eq(resumeDownloadTokens.token, token)).limit(1).all();
  if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Invalid or expired token" } });
    return;
  }
  db.delete(resumeDownloadTokens).where(eq(resumeDownloadTokens.token, token)).run();
  const path = join(uploadsDir, row.fileKey);
  if (!existsSync(path)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "File not found" } });
    return;
  }
  res.setHeader("Content-Disposition", "attachment");
  createReadStream(path).pipe(res);
});

router.use(authMiddleware);

router.post("/", upload.single("resume"), async (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "resume file required" } });
    return;
  }
  const id = uuid();
  const fileKey = `${user.userId}/${file.filename}`;
  const isPdf =
    file.mimetype === "application/pdf" ||
    (file.originalname && file.originalname.toLowerCase().endsWith(".pdf"));

  db.insert(resumes).values({
    id,
    userId: user.userId,
    fileKey,
    fileName: file.originalname || file.filename,
    uploadedAt: new Date(),
  }).run();

  let extractedFields: string[] = [];
  if (isPdf) {
    try {
      const extract = await extractAndParseResume(file.path);
      const extractJson =
        Object.keys(extract).length > 0
          ? {
              name: extract.name,
              email: extract.email,
              phone: extract.phone,
              address: extract.address,
              education: extract.education,
            }
          : null;
      db.update(resumes).set({ extract: extractJson }).where(eq(resumes.id, id)).run();
      if (extractJson) {
        if (extract.name) extractedFields.push("name");
        if (extract.email) extractedFields.push("email");
        if (extract.phone) extractedFields.push("phone");
        if (extract.address) extractedFields.push("address");
        if (extract.education?.length) extractedFields.push("education");
      }

      const profile = db.select().from(profiles).where(eq(profiles.userId, user.userId)).limit(1).get();
      if (profile && (extract.name || extract.phone || extract.address)) {
        const updates: Record<string, string | null> = {};
        if (extract.name && !profile.fullName?.trim()) updates.fullName = extract.name;
        if (extract.phone && !profile.phone?.trim()) updates.phone = extract.phone;
        if (extract.address && !profile.address?.trim()) updates.address = extract.address;
        if (Object.keys(updates).length > 0) {
          db.update(profiles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(profiles.id, profile.id))
            .run();
        }
      }
    } catch {
      // Parse failure: keep resume, leave extract null
    }
  }

  res.status(201).json({
    id,
    file_key: fileKey,
    file_name: file.originalname || file.filename,
    ...(extractedFields.length > 0 && { extracted: true, extracted_fields: extractedFields }),
  });
});

router.get("/", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const list = db.select().from(resumes).where(eq(resumes.userId, user.userId)).all();
  res.json({
    resumes: list.map((r) => ({ id: r.id, file_key: r.fileKey, file_name: r.fileName, uploaded_at: r.uploadedAt })),
  });
});

router.get("/file/:fileKey(*)", (req: Request, res: Response) => {
  const { user } = req as Request & { user: JwtPayload };
  const fileKey = req.params.fileKey as string;
  if (!fileKey.startsWith(user.userId + "/")) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
    return;
  }
  const path = join(uploadsDir, fileKey);
  if (!existsSync(path)) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "File not found" } });
    return;
  }
  res.setHeader("Content-Disposition", "attachment");
  createReadStream(path).pipe(res);
});

export default router;
