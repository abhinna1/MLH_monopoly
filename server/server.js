// server.js (CommonJS)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// pdf-parse can export either a function or { default: fn }
let pdfParse;
try {
  const pdfParseMod = require("pdf-parse");
  pdfParse = typeof pdfParseMod === "function" ? pdfParseMod : pdfParseMod.default;
} catch {
  pdfParse = null;
  console.warn("[warn] pdf-parse not found; will use PDF.js fallback for PDFs");
}

const mammoth = require("mammoth");
const fs = require("fs").promises;
const path = require("path");

// Try to load PDF.js fallback if installed (v3.x legacy build works with CJS)
let pdfjsLib = null;
try {
  pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js"); // npm i pdfjs-dist@3.11.174
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
app.use(express.json()); // JSON bodies for /api/course, /api/student, etc.

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

// Parse numbers robustly; keeps 0; extracts first numeric token from strings
function coercePoints(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const s = val.trim();
    if (s === "") return null;
    const m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Non-negative numeric (for scores) or null
function coerceNonNeg(val) {
  const n = coercePoints(val);
  if (n === null) return null;
  return n < 0 ? 0 : n;
}

// Biased die helpers
function computeScorePercent(scoreObtained, scoreMax, scorePercentInput) {
  if (scorePercentInput != null && Number.isFinite(Number(scorePercentInput))) {
    let p = Number(scorePercentInput);
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return p;
  }
  if (scoreObtained == null || scoreMax == null || !Number.isFinite(scoreMax) || scoreMax <= 0)
    return null;
  let p = (scoreObtained / scoreMax) * 100;
  if (!Number.isFinite(p)) return null;
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return p;
}

// Map percent → minimum die roll (1..6)
// 0-49 → 1, 50-69 → 2, 70-84 → 3, 85-94 → 4, 95-99 → 5, 100 → 6
function computeDieMin(percent) {
  if (percent == null || !Number.isFinite(percent)) return 1;
  if (percent >= 100) return 6;
  if (percent >= 95) return 5;
  if (percent >= 85) return 4;
  if (percent >= 70) return 3;
  if (percent >= 50) return 2;
  return 1;
}

// Uniform integer in [min, 6]
function rollFromMin(minVal) {
  const min = Math.max(1, Math.min(6, Math.floor(minVal || 1)));
  return Math.floor(Math.random() * (6 - min + 1)) + min;
}

async function extractTextFromPdfWithPdfjs(filePath) {
  if (!pdfjsLib) {
    throw new Error(
      "PDF.js fallback requested but pdfjs-dist is not installed. " +
        "Install with: npm i pdfjs-dist@3.11.174"
    );
  }
  const data = new Uint8Array(await fs.readFile(filePath)); // Buffer -> Uint8Array
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return out;
}

async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    if (pdfParse) {
      try {
        const parsed = await pdfParse(await fs.readFile(filePath));
        if (parsed && typeof parsed.text === "string" && parsed.text.trim()) {
          return parsed.text;
        }
        console.warn("[warn] pdf-parse produced empty text; trying PDF.js fallback");
      } catch (e) {
        console.warn("[warn] pdf-parse failed; trying PDF.js fallback:", e.message);
      }
    }
    return await extractTextFromPdfWithPdfjs(filePath);
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

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
      "points": "number (explicit or calculated)",
      "description": "short string summary"
    }
  ]
}

Extraction Rules:
- Map synonyms to types (e.g., "Exam 1" -> "midterm" if context suggests; else "assignment").
- Prefer explicit calendar dates. If only natural language dates exist, parse if clear.
- Keep tasks concise; one entry per deliverable/assessment.

Point Calculation Rules:
- If explicit points are listed for a task, use them.
- If a "Grade Policy" or weighting section is present (percentages & task counts), calculate task points assuming total 100 points:
  Task Points = (Category Percentage / Number of Tasks in Category)
- If neither explicit points nor weighting data is available, set "points" to null.

Syllabus text:
---
${text}
---
`.trim();

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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

// --- UB buildings + path generator -----------------------------------------
const UB_BUILDINGS = [
  "Capen Hall","Clemens Hall","Baldy Hall","Furnas Hall","Bell Hall","Davis Hall",
  "Knox Hall","Hochstetter Hall","Cooke Hall","NSC","Bonner Hall","Ketter Hall",
  "Park Hall","OBrian Hall","Lockwood Library","Silverman Library","Alfiero Center",
  "Jacobs Management Center","Slee Hall","Baird Hall","Center for the Arts",
  "Student Union","Commons","Alumni Arena","Alumni Center","Governor's Complex",
  "Flickinger Court","Ellicott Complex","Greiner Hall","Hadley Village",
  "Spaulding Quad","Richmond Quad","Wilkeson Quad","Evans Quad","Clement Quad",
  "Fronczak Hall","Jarvis Hall","Ramon Hall","Biomedical Education Building",
  "Harriman Hall","Harriman Quad","Sherman Hall","Farber Hall","Diefendorf Hall",
  "Squire Hall","Squire Annex","Biomedical Research Building","Cary Hall",
  "Sherman Annex","Kimball Tower","South Campus Library","Allen Hall","Parker Hall"
];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a path vector that is ratio×tasks with ascending rewards.
 * Rewards go from 1..N (monotonic). Names are random UB buildings.
 */
function makeAscendingPathVector(taskCount, ratio = 3) {
  const N = Math.max(1, Math.floor(taskCount * ratio));
  const namesPool = [];
  while (namesPool.length < N) namesPool.push(...shuffle([...UB_BUILDINGS]));
  const names = namesPool.slice(0, N);
  return names.map((name, i) => ({ name, reward: i + 1 }));
}

// ---------------- Mongo ----------------

const MONGO_URI = process.env.MONGO_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("[mongo] connected"))
  .catch((e) => {
    console.error("[mongo] connection error:", e.message);
    process.exit(1);
  });

// --- Schemas ---
const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["quiz", "midterm", "final", "assignment", "project", "participation"],
      set: (v) => (typeof v === "string" ? v.toLowerCase() : v),
    },
    dueDate: { type: Date },
    points: { type: Number, min: 0 },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const PathCellSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    reward: { type: Number, default: 0 },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "singleton" },
    professor: { type: String, trim: true },
    courseName: { type: String, required: true, trim: true },
    term: { type: String, required: true, trim: true },
    tasks: { type: [TaskSchema], default: [] },
    pathVector: { type: [PathCellSchema], default: [] },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", CourseSchema);

// Student (singleton) — tracks progress
const CompletedTaskSchema = new mongoose.Schema(
  {
    taskIndex: { type: Number, required: true, min: 0 },
    title: { type: String, default: "" },          // snapshot
    points: { type: Number, min: 0 },              // max points snapshot (from course.tasks[taskIndex].points)
    scoreObtained: { type: Number, min: 0 },       // raw score student earned
    scorePercent: { type: Number, min: 0, max: 100 }, // derived or provided
    completedAt: { type: Date, default: Date.now },
    rewardAtCell: { type: Number, default: 0 },    // reward gained on the move
    positionAfter: { type: Number, default: 0 },   // map index after move
    advanceByUsed: { type: Number, default: 0 },   // how many tiles advanced
    dieMinUsed: { type: Number },                  // if die roll was used
    dieRollUsed: { type: Number },                 // the actual die roll used (if any)
  },
  { _id: false }
);

const PendingCompletionSchema = new mongoose.Schema(
  {
    taskIndex: { type: Number, required: true },
    title: { type: String, default: "" },
    points: { type: Number, min: 0 },
    scoreObtained: { type: Number, min: 0 },
    scorePercent: { type: Number, min: 0, max: 100 },
    dieMin: { type: Number, min: 1, max: 6, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StudentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "singleton" },
    currentPosition: { type: Number, default: 0, min: 0 },
    totalReward: { type: Number, default: 0 },
    completedTasks: { type: [CompletedTaskSchema], default: [] },
    pendingCompletion: { type: PendingCompletionSchema, default: null }, // at most one pending die roll
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", StudentSchema);

// ---------------- Routes ----------------

// Multipart parse+LLM route
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
          points: coercePoints(t.points),
          description: t.description || "",
        }))
      : [];

    res.json({ courseName, term, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error parsing syllabus");
  } finally {
    try { await fs.unlink(filePath); } catch {}
  }
});

// Health check
app.get("/health", (_req, res) => res.send("ok"));

// ----- Course endpoints -----

// Upsert singleton course
app.post("/api/course", async (req, res) => {
  try {
    const { professor, courseName, term, tasks = [], pathVector = [] } = req.body;

    // normalize tasks
    const normTasks = tasks.map((t) => {
      const coerced = coercePoints(t.points);
      const cleanPoints =
        coerced === null ? undefined : Number.isFinite(coerced) ? coerced : undefined;

      return {
        title: t.title,
        type: t.type,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        points: cleanPoints,
        description: t.description || "",
      };
    });

    // Build a 3:1 path with ascending rewards (or enforce ascending if provided correctly)
    const desiredLen = Math.max(1, normTasks.length * 3);
    let finalPath;
    if (Array.isArray(pathVector) && pathVector.length === desiredLen) {
      finalPath = pathVector.slice(0, desiredLen).map((c, i) => ({
        name: String(c.name || `Tile ${i + 1}`),
        reward: i + 1, // force ascending so slower never beats faster
      }));
    } else {
      finalPath = makeAscendingPathVector(normTasks.length, 3);
    }

    const doc = { professor, courseName, term, tasks: normTasks, pathVector: finalPath };

    const saved = await Course.findByIdAndUpdate("singleton", doc, {
      upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid payload", details: err.message });
  }
});

// Get singleton course
app.get("/api/course", async (_req, res) => {
  const doc = await Course.findById("singleton");
  if (!doc) return res.status(404).json({ error: "No course found" });
  res.json(doc);
});

// ----- Student endpoints (singleton) -----

// Init/upsert singleton student (no payload needed)
app.post("/api/student", async (_req, res) => {
  try {
    let s = await Student.findById("singleton");
    if (!s) s = await Student.create({ _id: "singleton" });
    res.status(201).json(s);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid payload", details: err.message });
  }
});

// Get singleton student
app.get("/api/student", async (_req, res) => {
  const s = await Student.findById("singleton");
  if (!s) return res.status(404).json({ error: "No student found" });
  res.json(s);
});

// Reset student progress
app.post("/api/student/reset", async (_req, res) => {
  try {
    let s = await Student.findById("singleton");
    if (!s) {
      s = await Student.create({ _id: "singleton" });
    } else {
      s.currentPosition = 0;
      s.totalReward = 0;
      s.completedTasks = [];
      s.pendingCompletion = null; // clear any pending die
      await s.save();
    }
    res.json(s);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to reset", details: err.message });
  }
});

// Move student along path (collect reward). Body: { advanceBy?: number }
app.post("/api/student/move", async (req, res) => {
  try {
    const advanceBy = Number(req.body?.advanceBy ?? 1);
    const step = Number.isFinite(advanceBy) ? Math.trunc(advanceBy) : 1;

    const course = await Course.findById("singleton");
    let s = await Student.findById("singleton");
    if (!s) s = await Student.create({ _id: "singleton" });

    let rewardGained = 0;
    let newPos = s.currentPosition;

    if (course?.pathVector?.length) {
      const N = course.pathVector.length;
      newPos = ((s.currentPosition + step) % N + N) % N; // supports negative steps
      rewardGained = Number(course.pathVector[newPos]?.reward ?? 0);
      if (!Number.isFinite(rewardGained)) rewardGained = 0;
    }

    s.currentPosition = newPos;
    s.totalReward += rewardGained;
    await s.save();

    res.json({ currentPosition: s.currentPosition, totalReward: s.totalReward, rewardGained });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to move", details: err.message });
  }
});

// Complete a task and (optionally) roll immediately depending on inputs.
app.post("/api/student/complete-task", async (req, res) => {
  try {
    const rawIdx = req.body?.taskIndex;
    if (!Number.isFinite(Number(rawIdx)))
      return res.status(400).json({ error: "taskIndex is required and must be a number" });
    const taskIndex = Math.trunc(Number(rawIdx));

    const advanceByInput = req.body?.advanceBy;
    const scoreObtainedInput = coerceNonNeg(req.body?.scoreObtained);
    const scorePercentInput = coerceNonNeg(req.body?.scorePercent);
    const deferRoll = !!req.body?.deferRoll;

    const course = await Course.findById("singleton");
    if (!course) return res.status(400).json({ error: "Course not found" });
    if (!Array.isArray(course.tasks) || taskIndex < 0 || taskIndex >= course.tasks.length) {
      return res.status(400).json({ error: "Invalid taskIndex" });
    }

    let s = await Student.findById("singleton");
    if (!s) s = await Student.create({ _id: "singleton" });

    if (s.completedTasks.some((t) => t.taskIndex === taskIndex)) {
      return res.json({ message: "Task already completed", student: s });
    }
    if (deferRoll && s.pendingCompletion) {
      return res.status(400).json({ error: "A die roll is already pending. Please roll it first." });
    }

    const taskSnap = course.tasks[taskIndex] || {};
    const pointsSnap =
      Number.isFinite(Number(taskSnap.points)) ? Number(taskSnap.points) : undefined;

    const scoreObtained =
      scoreObtainedInput != null && Number.isFinite(scoreObtainedInput)
        ? scoreObtainedInput
        : null;
    const percent = computeScorePercent(scoreObtained, pointsSnap, scorePercentInput);

    // 1) Explicit advanceBy → immediate move
    if (Number.isFinite(Number(advanceByInput))) {
      const step = Math.trunc(Number(advanceByInput));
      const N = course.pathVector?.length || 0;
      let rewardGained = 0;
      let newPos = s.currentPosition;
      if (N) {
        newPos = ((s.currentPosition + step) % N + N) % N;
        rewardGained = Number(course.pathVector[newPos]?.reward ?? 0);
        if (!Number.isFinite(rewardGained)) rewardGained = 0;
      }
      s.completedTasks.push({
        taskIndex,
        title: taskSnap.title || "",
        points: pointsSnap,
        scoreObtained: scoreObtained ?? undefined,
        scorePercent: percent ?? undefined,
        completedAt: new Date(),
        rewardAtCell: rewardGained,
        positionAfter: newPos,
        advanceByUsed: step,
      });
      s.currentPosition = newPos;
      s.totalReward += rewardGained;
      await s.save();
      return res.json({
        message: "Task completed (advanceBy)",
        rewardGained,
        positionAfter: newPos,
        totalReward: s.totalReward,
        scoring: { pointsMax: pointsSnap ?? null, scoreObtained: scoreObtained ?? null, scorePercent: percent ?? null },
        die: null,
        student: s,
      });
    }

    // 2) Scoring present
    if (percent != null) {
      const dieMin = computeDieMin(percent);

      if (deferRoll) {
        s.pendingCompletion = {
          taskIndex,
          title: taskSnap.title || "",
          points: pointsSnap,
          scoreObtained: scoreObtained ?? undefined,
          scorePercent: percent,
          dieMin,
          createdAt: new Date(),
        };
        await s.save();
        return res.json({ message: "Pending die created", pending: { taskIndex, dieMin }, student: s });
      }

      // immediate roll
      const dieRoll = rollFromMin(dieMin);
      const step = dieRoll;
      const N = course.pathVector?.length || 0;
      let rewardGained = 0;
      let newPos = s.currentPosition;
      if (N) {
        newPos = ((s.currentPosition + step) % N + N) % N;
        rewardGained = Number(course.pathVector[newPos]?.reward ?? 0);
        if (!Number.isFinite(rewardGained)) rewardGained = 0;
      }

      s.completedTasks.push({
        taskIndex,
        title: taskSnap.title || "",
        points: pointsSnap,
        scoreObtained: scoreObtained ?? undefined,
        scorePercent: percent,
        completedAt: new Date(),
        rewardAtCell: rewardGained,
        positionAfter: newPos,
        advanceByUsed: step,
        dieMinUsed: dieMin,
        dieRollUsed: dieRoll,
      });
      s.currentPosition = newPos;
      s.totalReward += rewardGained;
      await s.save();
      return res.json({
        message: "Task completed (immediate roll)",
        rewardGained,
        positionAfter: newPos,
        totalReward: s.totalReward,
        scoring: { pointsMax: pointsSnap ?? null, scoreObtained: scoreObtained ?? null, scorePercent: percent },
        die: { min: dieMin, roll: dieRoll },
        student: s,
      });
    }

    // 3) No scoring provided → default step 1
    const step = 1;
    const N = course.pathVector?.length || 0;
    let rewardGained = 0;
    let newPos = s.currentPosition;
    if (N) {
      newPos = ((s.currentPosition + step) % N + N) % N;
      rewardGained = Number(course.pathVector[newPos]?.reward ?? 0);
      if (!Number.isFinite(rewardGained)) rewardGained = 0;
    }
    s.completedTasks.push({
      taskIndex,
      title: taskSnap.title || "",
      points: pointsSnap,
      completedAt: new Date(),
      rewardAtCell: rewardGained,
      positionAfter: newPos,
      advanceByUsed: step,
    });
    s.currentPosition = newPos;
    s.totalReward += rewardGained;
    await s.save();
    res.json({
      message: "Task completed (default +1)",
      rewardGained,
      positionAfter: newPos,
      totalReward: s.totalReward,
      die: null,
      student: s,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to complete task", details: err.message });
  }
});

// Roll the pending die and finalize the move
app.post("/api/student/roll-die", async (_req, res) => {
  try {
    const course = await Course.findById("singleton");
    if (!course) return res.status(400).json({ error: "Course not found" });

    let s = await Student.findById("singleton");
    if (!s) s = await Student.create({ _id: "singleton" });
    const p = s.pendingCompletion;
    if (!p) return res.status(400).json({ error: "No pending die to roll." });

    const dieMin = Math.max(1, Math.min(6, Math.floor(p.dieMin || 1)));
    const dieRoll = rollFromMin(dieMin);
    const step = dieRoll;

    const N = course.pathVector?.length || 0;
    let rewardGained = 0;
    let newPos = s.currentPosition;
    if (N) {
      newPos = ((s.currentPosition + step) % N + N) % N;
      rewardGained = Number(course.pathVector[newPos]?.reward ?? 0);
      if (!Number.isFinite(rewardGained)) rewardGained = 0;
    }

    s.completedTasks.push({
      taskIndex: p.taskIndex,
      title: p.title || "",
      points: p.points,
      scoreObtained: p.scoreObtained,
      scorePercent: p.scorePercent,
      completedAt: new Date(),
      rewardAtCell: rewardGained,
      positionAfter: newPos,
      advanceByUsed: step,
      dieMinUsed: dieMin,
      dieRollUsed: dieRoll,
    });

    s.currentPosition = newPos;
    s.totalReward += rewardGained;
    s.pendingCompletion = null;

    await s.save();

    res.json({
      message: "Rolled",
      die: { min: dieMin, roll: dieRoll },
      rewardGained,
      positionAfter: newPos,
      totalReward: s.totalReward,
      student: s,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to roll die", details: err.message });
  }
});

// ---------------- Boot ----------------

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
