import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { db, users, profiles, preferences, resumes, jobs } from "./index.js";
import { eq } from "drizzle-orm";
import { extractAndParseResume } from "../services/resumeParser.js";

const DEMO_EMAIL = "demo@glider.local";
const DEMO_PASSWORD = "demo12345";

const uploadsDir = join(process.cwd(), "data", "uploads");

async function createDummyResumePdf(filePath: string): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedStandardFont(StandardFonts.Helvetica);
  let y = 800;
  const lineHeight = 18;
  const size = 12;

  const lines = [
    "Jane Doe",
    "jane.doe@example.com",
    "(555) 123-4567",
    "123 Main St, San Francisco, CA 94102",
    "",
    "Education",
    "B.S. Computer Science, Stanford University, 2020",
    "M.S. Software Engineering, MIT, 2022",
  ];

  for (const line of lines) {
    page.drawText(line, { x: 50, y, size, font });
    y -= lineHeight;
  }

  const pdfBytes = await doc.save();
  writeFileSync(filePath, pdfBytes);
}

async function main() {
  console.log("Seeding dummy data...");

  let user = db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1).get();
  if (!user) {
    const id = uuid();
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    db.insert(users).values({ id, email: DEMO_EMAIL, passwordHash, createdAt: now, updatedAt: now }).run();
    db.insert(profiles).values({ id: uuid(), userId: id, createdAt: now, updatedAt: now }).run();
    db.insert(preferences).values({
      id: uuid(),
      userId: id,
      ...preferencesDefault,
      createdAt: now,
      updatedAt: now,
    }).run();
    user = db.select().from(users).where(eq(users.id, id)).limit(1).get()!;
    console.log("Created demo user:", DEMO_EMAIL);
  }

  const profile = db.select().from(profiles).where(eq(profiles.userId, user!.id)).limit(1).get();
  if (profile) {
    const now = new Date();
    db.update(profiles)
      .set({
        fullName: "Jane Doe",
        phone: "(555) 123-4567",
        location: "San Francisco, CA",
        address: "123 Main St, San Francisco, CA 94102",
        dateOfBirth: "1995-06-15",
        linkedinUrl: "https://linkedin.com/in/janedoe",
        portfolioUrl: "https://janedoe.dev",
        summary: "Software engineer with 3+ years of experience in full-stack development. Passionate about building scalable applications.",
        updatedAt: now,
      })
      .where(eq(profiles.id, profile.id))
      .run();
    console.log("Updated profile with dummy data.");
  }

  const userDir = join(uploadsDir, user!.id);
  if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true });
  const resumeFileName = `${uuid()}-seed-resume.pdf`;
  const resumePath = join(userDir, resumeFileName);
  const fileKey = `${user!.id}/${resumeFileName}`;

  await createDummyResumePdf(resumePath);
  const extract = await extractAndParseResume(resumePath);

  const resumeId = uuid();
  db.insert(resumes).values({
    id: resumeId,
    userId: user!.id,
    fileKey,
    fileName: "seed-resume.pdf",
    extract: extract.name || extract.email ? { name: extract.name, email: extract.email, phone: extract.phone, address: extract.address, education: extract.education } : null,
    uploadedAt: new Date(),
  }).run();
  console.log("Created dummy resume with parsed extract.");

  const dummyJobs = [
    { url: "https://boards.greenhouse.io/tinyfish/jobs/1", title: "Senior Software Engineer", company: "TinyFish" },
    { url: "https://boards.greenhouse.io/example/jobs/100", title: "Full Stack Developer", company: "Example Inc" },
    { url: "https://boards.greenhouse.io/startup/jobs/42", title: "Backend Engineer", company: "Startup Co" },
  ];

  for (const j of dummyJobs) {
    const existing = db.select().from(jobs).where(eq(jobs.sourceUrl, j.url)).limit(1).get();
    if (!existing) {
      db.insert(jobs).values({
        id: uuid(),
        sourceUrl: j.url,
        platform: "greenhouse",
        companyName: j.company,
        jobTitle: j.title,
        discoveredAt: new Date(),
        createdAt: new Date(),
      }).run();
    }
  }
  console.log("Added dummy jobs.");

  console.log("Seed done. Use Demo login to see profile, resume, and jobs.");
}

const preferencesDefault = { roles: [] as string[], techStack: [] as string[], locations: [] as string[], companyTypes: [] as string[] };

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
