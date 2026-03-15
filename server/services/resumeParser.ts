import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";

export interface EducationEntry {
  degree?: string;
  school?: string;
  year?: string;
}

export interface ResumeExtract {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  education?: EducationEntry[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|[0-9]{3}[-.\s][0-9]{3}[-.\s][0-9]{4}/;
const US_ZIP_RE = /\b[0-9]{5}(?:-[0-9]{4})?\b/;
const YEAR_RE = /\b(19|20)[0-9]{2}\b/;

const EDUCATION_HEADERS = /^(education|academic|degrees?|qualifications?|graduation)\s*$/i;
const DEGREE_PATTERNS = /\b(B\.?S\.?|B\.?A\.?|B\.?E\.?|M\.?S\.?|M\.?A\.?|M\.?E\.?|M\.?B\.?A\.?|Ph\.?D\.?|B\.?Tech|M\.?Tech|B\.?S\.?c\.?|M\.?S\.?c\.?|Associate|Certificate)/i;

/**
 * Extract raw text from a PDF file.
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text ?? "";
  } finally {
    await parser.destroy();
  }
}

/**
 * Parse resume text into structured ResumeExtract using regex and heuristics.
 */
export function parseResume(text: string): ResumeExtract {
  const extract: ResumeExtract = {};
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return extract;

  // Email: first match in document
  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) extract.email = emailMatch[0];

  // Phone: first match
  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) extract.phone = phoneMatch[0].trim();

  // Name: first line that is not email, not phone, and not a section header
  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (EDUCATION_HEADERS.test(line) || line.toLowerCase() === "experience" || line.toLowerCase() === "summary") continue;
    if (line.length > 80) continue; // likely a paragraph
    extract.name = line;
    break;
  }

  // Address: look for a line containing US zip or "street" / "city" style
  for (const line of lines.slice(0, 20)) {
    if (US_ZIP_RE.test(line) || /\b(street|st|avenue|ave|blvd|road|rd|city|state|zip)\b/i.test(line)) {
      extract.address = line;
      break;
    }
  }
  if (!extract.address && lines.length >= 2 && extract.name && lines[0] === extract.name) {
    const second = lines[1];
    if (!EMAIL_RE.test(second) && !PHONE_RE.test(second) && second.length < 60) extract.address = second;
  }

  // Education: find section then capture degree/school/year lines
  const education: EducationEntry[] = [];
  let inEducation = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (EDUCATION_HEADERS.test(line)) {
      inEducation = true;
      continue;
    }
    if (inEducation) {
      if (DEGREE_PATTERNS.test(line) || (line.length < 80 && YEAR_RE.test(line))) {
        const yearMatch = line.match(YEAR_RE);
        const year = yearMatch ? yearMatch[0] : undefined;
        const degreeMatch = line.match(DEGREE_PATTERNS);
        const degree = degreeMatch ? degreeMatch[0].trim() : undefined;
        const rest = line.replace(YEAR_RE, "").replace(DEGREE_PATTERNS, "").replace(/,+/g, " ").trim();
        const parts = rest.split(/\s*[,|]\s*/).map((p) => p.trim()).filter(Boolean);
        const school = parts[0] || rest || undefined;
        education.push({ degree, school: school || undefined, year });
      }
      if (education.length >= 3) break;
    }
  }
  if (education.length > 0) extract.education = education;

  return extract;
}

/**
 * Extract text from PDF and parse into ResumeExtract.
 */
export async function extractAndParseResume(filePath: string): Promise<ResumeExtract> {
  const text = await extractTextFromPdf(filePath);
  return parseResume(text);
}
