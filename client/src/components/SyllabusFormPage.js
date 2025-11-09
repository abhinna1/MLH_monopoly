// SyllabusFormPage.jsx
import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const UB = {
  blue: "#005BBB",
  harriman: "#002F56",
  gray: "#666666",
  grayLight: "#E4E4E4",
  yellow: "#FFC72C",
  teal: "#00A69C",
  orange: "#E56A54",
  sky: "#2F9FD0",
};

const baseEmptyTask = {
  title: "",
  type: "quiz",
  dueDate: "",
  points: "",
  description: "",
};

const inputCls =
  `block w-full rounded-lg border px-3 py-2 ` +
  `border-[${UB.grayLight}] ` +
  `focus:outline-none focus:ring-2 focus:ring-[${UB.yellow}] focus:border-[${UB.blue}]`;

const labelCls = `block text-sm font-medium mb-1 text-[${UB.harriman}]`;
const fieldsetCls = `rounded-xl border bg-white p-4 shadow-sm border-[${UB.grayLight}]`;

// ----- RNG helpers: integers only -----
const randInt = (min, max) => {
  const lo = Math.ceil(Number(min));
  const hi = Math.floor(Number(max));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return 1;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const range = hi - lo + 1;
    const maxUint = 0xffffffff;
    const limit = Math.floor(maxUint / range) * range;
    let x;
    do {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return lo + (x % range);
  }
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};

// Tunables
const REWARD_MIN = 1;
const REWARD_MAX = 20;
const POINTS_MIN = 5;
const POINTS_MAX = 30;

function SyllabusFormPage() {
  const { user } = useAuth0();

  const [courseName, setCourseName] = useState("");
  const [term, setTerm] = useState("");
  // seed first task with random points so the input shows something useful
  const [tasks, setTasks] = useState([
    { ...baseEmptyTask, points: String(randInt(POINTS_MIN, POINTS_MAX)) },
  ]);

  // Import (LLM) state
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Save-to-API state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const handleTaskChange = (index, field, value) => {
    setTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addTask = () =>
    setTasks((prev) => [
      ...prev,
      { ...baseEmptyTask, points: String(randInt(POINTS_MIN, POINTS_MAX)) },
    ]);

  const removeTask = (index) =>
    setTasks((prev) => prev.filter((_, i) => i !== index));

  // Build path vector with RANDOM rewards (independent of points)
  const buildPathVectorFromTasks = (ts) =>
    ts.map((t, i) => ({
      name: (t.title || "").trim() || `${t.type} ${i + 1}`,
      reward: randInt(REWARD_MIN, REWARD_MAX),
    }));

  // Save course to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveOk(false);
    setSaveError("");
    setIsSaving(true);

    try {
      // Ensure each task.points is an integer; generate if missing/invalid
      const tasksForSave = tasks.map((t) => {
        const n = Number(t.points);
        const cleanPoints = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : randInt(POINTS_MIN, POINTS_MAX);
        return {
          title: t.title || "",
          type: t.type || "assignment",
          dueDate: t.dueDate || "",
          points: cleanPoints,
          description: t.description || "",
        };
      });

      const payload = {
        professor: user?.email || "",
        courseName,
        term,
        tasks: tasksForSave,
        pathVector: buildPathVectorFromTasks(tasksForSave),
      };

      console.log("Submitting course payload:", payload);

      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Save failed (${res.status})`);
      }

      setSaveOk(true);
    } catch (err) {
      setSaveError(err.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Upload syllabus -> backend LLM parse -> populate form
  const handleFilePick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError("");
    setIsImporting(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/syllabus/parse`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Import failed (${res.status})`);
      }

      const data = await res.json(); // { courseName, term, tasks: [...] }

      setCourseName(data.courseName || "");
      setTerm(data.term || "");
      if (Array.isArray(data.tasks) && data.tasks.length) {
        setTasks(
          data.tasks.map((t) => {
            // If the LLM didn't provide points, generate a random integer
            const n = Number(t.points);
            const cleanPoints =
              Number.isFinite(n) && n >= 0 ? Math.trunc(n) : randInt(POINTS_MIN, POINTS_MAX);
            return {
              title: t.title || "",
              type: t.type || "assignment",
              dueDate: (t.dueDate || "").slice(0, 10), // for <input type="date" />
              points: String(cleanPoints),
              description: t.description || "",
            };
          })
        );
      }
    } catch (err) {
      setImportError(err.message || "Import failed.");
    } finally {
      setIsImporting(false);
      event.target.value = ""; // allow re-selecting same file
    }
  };

  return (
    <div className="mx-auto max-w-3xl text-left">
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-2xl font-bold text-[${UB.harriman}]`}>
          Syllabus Builder
        </h2>
        <p className={`mt-1 text-sm text-[${UB.gray}]`}>
          Create your course syllabus with gamified tasks.
        </p>
        {user?.email && (
          <p
            className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm text-[${UB.harriman}]`}
            style={{ backgroundColor: `${UB.blue}1A` }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: UB.blue }}
            />
            Signed in as <strong className="ml-1">{user.email}</strong>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course meta */}
        <section className={fieldsetCls}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Course Name</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className={inputCls}
                placeholder="e.g., CSE 250 - Data Structures"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Term</label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className={inputCls}
                placeholder="e.g., Fall 2025"
                required
              />
            </div>
          </div>

          {/* Import row */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <input
                id="syllabus-file"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={handleFilePick}
              />
              <label
                htmlFor="syllabus-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border focus:outline-none focus:ring-2"
                style={{
                  borderColor: UB.blue,
                  color: UB.blue,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = `${UB.blue}0D`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                📄 Import from Syllabus
              </label>
            </div>

            <div className="text-sm">
              {isImporting ? (
                <span className="italic" style={{ color: UB.gray }}>
                  Parsing…
                </span>
              ) : importError ? (
                <span style={{ color: UB.orange }}>{importError}</span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Tasks */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold text-[${UB.harriman}]`}>
              Tasks
            </h3>
            <button
              type="button"
              onClick={addTask}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border focus:outline-none focus:ring-2"
              style={{
                borderColor: UB.blue,
                color: UB.blue,
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = UB.blue)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              ＋ Add Task
            </button>
          </div>

          {tasks.map((task, index) => (
            <fieldset key={index} className={fieldsetCls}>
              <legend className={`px-2 text-sm font-semibold text-[${UB.blue}]`}>
                Task #{index + 1}
              </legend>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelCls}>Title</label>
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) =>
                      handleTaskChange(index, "title", e.target.value)
                    }
                    className={inputCls}
                    placeholder="e.g., Quiz 1: Recursion"
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Type</label>
                  <select
                    value={task.type}
                    onChange={(e) =>
                      handleTaskChange(index, "type", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="participation">Participation</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Due Date</label>
                  <input
                    type="date"
                    value={task.dueDate}
                    onChange={(e) =>
                      handleTaskChange(index, "dueDate", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Points</label>
                  <input
                    type="number"
                    value={task.points}
                    onChange={(e) =>
                      handleTaskChange(index, "points", e.target.value)
                    }
                    className={inputCls}
                    min="0"
                    placeholder="e.g., 10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={task.description}
                    onChange={(e) =>
                      handleTaskChange(index, "description", e.target.value)
                    }
                    className={inputCls}
                    rows={3}
                    placeholder="Brief details, rubric, links, etc."
                  />
                </div>
              </div>

              {tasks.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2"
                    style={{
                      color: UB.harriman,
                      backgroundColor: `${UB.orange}1A`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = `${UB.orange}33`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = `${UB.orange}1A`)
                    }
                  >
                    Remove Task
                  </button>
                </div>
              )}
            </fieldset>
          ))}
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {saveError && (
            <span className="text-sm" style={{ color: UB.orange }}>
              {saveError}
            </span>
          )}
          {saveOk && (
            <span className="text-sm" style={{ color: UB.teal }}>
              Saved!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 disabled:opacity-60"
            style={{ backgroundColor: UB.yellow, color: UB.harriman }}
            onMouseEnter={(e) =>
              !isSaving && (e.currentTarget.style.backgroundColor = UB.sky)
            }
            onMouseLeave={(e) =>
              !isSaving && (e.currentTarget.style.backgroundColor = UB.yellow)
            }
          >
            {isSaving ? "Saving…" : "Save Syllabus"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SyllabusFormPage;
