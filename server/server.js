// server.js (CommonJS)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");

// pdf-parse can export either a function or { default: fn }
// With pdf-parse@^1.1.1, this will correctly resolve the function.
const pdfParseMod = require("pdf-parse");
const pdfParse = typeof pdfParseMod === "function" ? pdfParseMod : pdfParseMod.default;

const mammoth = require("mammoth");
const fs = require("fs").promises;
const path = require("path");

// Try to load PDF.js fallback if installed (v3.x legacy build works with CJS)
let pdfjsLib = null;
try {
  pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js"); // requires pdfjs-dist@^3
} catch {
  console.warn(
    "[warn] pdfjs-dist not found; PDF.js fallback disabled. " +
      "To enable, run: npm i pdfjs-dist@3.11.174"
  );
}

// Node 18+ has fetch built-in
const fetchFn = globalThis.fetch;

dotenv.config();

const app = express();
app.use(cors());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// ---------------- Helpers ----------------

function normalizeDate(str) {
  if (!str) return "";
  const isoCandidate = new Date(str);
  if (!isNaN(isoCandidate)) return isoCandidate.toISOString().slice(0, 10);
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return "";
}

// --- FIXED FUNCTION ---
async function extractTextFromPdfWithPdfjs(filePath) {
  if (!pdfjsLib) {
    throw new Error(
      "PDF.js fallback requested but pdfjs-dist is not installed. " +
        "Install with: npm i pdfjs-dist@3.11.174"
    );
  }
  // Convert Node.js Buffer from readFile into a Uint8Array for pdfjs-dist
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjsLib.getDocument(data).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return out;
}
// --- END OF FIX ---

async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    try {
      const parsed = await pdfParse(await fs.readFile(filePath));
      if (parsed && typeof parsed.text === "string" && parsed.text.trim()) {
        return parsed.text;
      }
      console.warn("[warn] pdf-parse produced empty text; trying PDF.js fallback");
      return await extractTextFromPdfWithPdfjs(filePath);
    } catch (e) {
      console.warn("[warn] pdf-parse failed; trying PDF.js fallback:", e.message);
      return await extractTextFromPdfWithPdfjs(filePath);
    }
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  // .txt, .md, etc.
  return (await fs.readFile(filePath)).toString("utf8");
}

async function geminiExtractSyllabus(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" +
    `?key=${encodeURIComponent(apiKey)}`;

  const prompt = `
You are given a university course syllabus. Extract the following JSON:

{
  "courseName": "string",
  "term": "string (e.g., Fall 2025)",
  "tasks": [
    {
      "title": "string",
      "type": "one of [quiz, midterm, final, assignment, project, participation]",
      "dueDate": "YYYY-MM-DD if provided; else empty string",
      "points": "number if provided, else null",
      "description": "short string summary"
    }
  ]
}

- Map synonyms to types ("Exam 1" -> "midterm" if context suggests; else "assignment").
- Do not invent data. If a field is missing, leave it empty string or null as specified.
- Prefer explicit calendar dates. If only natural language dates exist, parse if clear.
- Keep tasks concise; one entry per deliverable/assessment.

Syllabus text:
---
${text}
---
`.trim();

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    // The REST API accepts snake_case here; models still tend to reply with JSON text
    generationConfig: { response_mime_type: "application/json" },
  };

  const resp = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Gemini response status:", resp.status);

  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`Gemini error ${resp.status}: ${msg}`);
  }

  const json = await resp.json();

  const textOut =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ??
    json?.candidates?.[0]?.content?.parts?.[0]?.inline_data ??
    "";

  if (!textOut || typeof textOut !== "string") {
    throw new Error("Empty response from Gemini");
  }

  // Be defensive if the model adds stray characters
  try {
    return JSON.parse(textOut);
  } catch {
    const start = textOut.indexOf("{");
    const end = textOut.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Gemini did not return valid JSON");
    }
    return JSON.parse(textOut.slice(start, end + 1));
  }
}

// ---------------- Routes ----------------

app.post("/api/syllabus/parse", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  const filePath = req.file.path;

  try {
    const text = await extractTextFromFile(filePath, req.file.originalname);
    if (!text || !text.trim()) {
      return res.status(400).send("Could not extract text from file.");
    }

    const raw = await geminiExtractSyllabus(text);

    const courseName = raw.courseName || "";
    const term = raw.term || "";
    const tasks = Array.isArray(raw.tasks)
      ? raw.tasks.map((t) => ({
          title: t.title || "",
          type: (t.type || "assignment").toLowerCase(),
          dueDate: normalizeDate(t.dueDate || ""),
          points:
            typeof t.points === "number"
              ? t.points
              : t.points == null
              ? null
              : Number(t.points) || null,
          description: t.description || "",
        }))
      : [];

    res.json({ courseName, term, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error parsing syllabus");
  } finally {
    try {
      await fs.unlink(filePath);
    } catch {}
  }
});

// Optional health check
app.get("/healthz", (_req, res) => res.send("ok"));

// ---------------- Boot ----------------

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});