// components/Board.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Chatbot from "./Chatbot";
import CenterVictor from "./CenterVictor";

const BAR_COLORS = [
  "#005BBB",
  "#002F56",
  "#2F9FD0",
  "#00A69C",
  "#E56A54",
  "#FFC72C",
];
const BAR_THICKNESS = 16;

function colorFor(label, idx) {
  const s = String(label ?? "") + "|" + idx;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const i = Math.abs(h) % BAR_COLORS.length;
  return BAR_COLORS[i];
}

function TileHorizontal({ label, reward, orientation = "top", active, color }) {
  const barStyle =
    orientation === "top"
      ? {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: BAR_THICKNESS,
          background: color,
        }
      : {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BAR_THICKNESS,
          background: color,
        };
  const contentPad =
    orientation === "top"
      ? { paddingTop: BAR_THICKNESS + 4 }
      : { paddingBottom: BAR_THICKNESS + 4 };
  return (
    <div
      className={`border border-slate-400 h-full flex flex-col bg-white/90 relative transition-transform duration-500 ${
        active ? "ring-4 ring-amber-400/70 scale-[1.8] z-[100] shadow-2xl" : ""
      }`}
    >
      <div style={barStyle} />
      <div
        className="flex-1 flex flex-col items-center justify-center text-[11px] text-center leading-tight text-slate-800"
        style={contentPad}
      >
        <div className="font-medium">{label}</div>
        <div className="mt-2 font-semibold text-slate-900">⭐ {reward}</div>
        {active && (
          <div className="mt-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Buffalo_Bulls_logo.svg/120px-Buffalo_Bulls_logo.svg.png" 
              alt="Player" 
              className="w-8 h-8 animate-bounce"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TileVertical({ label, reward, orientation = "right", active, color }) {
  const barStyle =
    orientation === "left"
      ? {
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: BAR_THICKNESS,
          background: color,
        }
      : {
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: BAR_THICKNESS,
          background: color,
        };
  const contentPad =
    orientation === "left"
      ? { paddingLeft: BAR_THICKNESS + 4 }
      : { paddingRight: BAR_THICKNESS + 4 };
  return (
    <div
      className={`border border-slate-400 flex flex-col bg-white/90 h-full min-h-0 relative transition-transform duration-500 ${
        active ? "ring-4 ring-amber-400/70 scale-[1.8] z-[100] shadow-2xl" : ""
      }`}
    >
      <div style={barStyle} />
      <div
        className="flex-1 flex flex-col items-center justify-center text-[11px] text-center leading-tight text-slate-800"
        style={contentPad}
      >
        <div className="font-medium">{label}</div>
        <div className="mt-2 font-semibold text-slate-900">⭐ {reward}</div>
        {active && (
          <div className="mt-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Buffalo_Bulls_logo.svg/120px-Buffalo_Bulls_logo.svg.png" 
              alt="Player" 
              className="w-8 h-8 animate-bounce"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function splitCounts(N) {
  const base = Math.floor(N / 4);
  const extra = N % 4;
  const counts = [base, base, base, base];
  for (let i = 0; i < extra; i++) counts[i] += 1;
  return counts;
}

export default function Board() {
  const [path, setPath] = useState([]);
  const [course, setCourse] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastRoll, setLastRoll] = useState(null); // { roll, min, reward }
  const [zoomEnabled, setZoomEnabled] = useState(true); // toggle zoom effect

  // Complete modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState(null);
  const [scoreInput, setScoreInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  // toast
  const [toast, setToast] = useState("");

  // Die roll animation
  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(1);
  const rollTimer = useRef(null);

  const tasks = Array.isArray(course?.tasks) ? course.tasks : [];

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("http://localhost:8000/api/course"),
        fetch("http://localhost:8000/api/student"),
      ]);
      if (!cRes.ok) throw new Error(`Course fetch failed (${cRes.status})`);
      const courseJson = await cRes.json();
      setCourse(courseJson);
      setPath(
        Array.isArray(courseJson?.pathVector) ? courseJson.pathVector : []
      );
      if (sRes.ok) setStudent(await sRes.json());
      else setStudent(null);
    } catch (e) {
      setErr(e.message || "Failed to load board.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => {
      if (rollTimer.current) clearInterval(rollTimer.current);
    };
  }, []);

  // student actions
  const initStudent = async () => {
    await fetch("http://localhost:8000/api/student", { method: "POST" });
    await fetchAll();
  };
  const resetStudent = async () => {
    await fetch("http://localhost:8000/api/student/reset", { method: "POST" });
    await fetchAll();
  };
  const moveBy = async (n = 1) => {
    await fetch("http://localhost:8000/api/student/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advanceBy: n }),
    });
    await fetchAll();
  };

  // open/close complete modal
  const openCompleteModal = (task) => {
    setModalTask(task);
    setScoreInput("");
    setSubmitMsg("");
    setModalOpen(true);
  };
  const closeCompleteModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setModalTask(null);
    setScoreInput("");
    setSubmitMsg("");
  };

  // complete with score → store pending die (no move yet)
  const submitCompletion = async () => {
    if (!modalTask) return;
    const idx = modalTask.i;

    const hasMax = Number.isFinite(Number(modalTask.points));
    const val = Number(scoreInput);

    if (!Number.isFinite(val) || val < 0) {
      setSubmitMsg("Enter a valid non-negative number.");
      return;
    }
    if (!hasMax && val > 100) {
      setSubmitMsg("Percent cannot exceed 100.");
      return;
    }
    if (hasMax && val > Number(modalTask.points)) {
      setSubmitMsg(`Score cannot exceed max (${modalTask.points}).`);
      return;
    }

    const body = hasMax
      ? { taskIndex: idx, scoreObtained: val, deferRoll: true }
      : { taskIndex: idx, scorePercent: val, deferRoll: true };

    try {
      setSubmitting(true);
      setSubmitMsg("");
      const res = await fetch(
        "http://localhost:8000/api/student/complete-task",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Completion failed (${res.status})`);
      }
      const data = await res.json();
      const dmin = data?.pending?.dieMin;
      if (dmin) {
        setToast(`Die ready: minimum ${dmin}. Press “Roll Die”.`);
        setTimeout(() => setToast(""), 3000);
      }
      closeCompleteModal();
      await fetchAll();
    } catch (e) {
      setSubmitMsg(e.message || "Failed to complete.");
    } finally {
      setSubmitting(false);
    }
  };

  const { bottomSeg, leftSeg, topSeg, rightSeg } = useMemo(() => {
    const L = path.length;
    const [bc, lc, tc, rc] = splitCounts(L);
    const b = path.slice(0, bc);
    const l = path.slice(bc, bc + lc);
    const t = path.slice(bc + lc, bc + lc + tc);
    const r = path.slice(bc + lc + tc, bc + lc + tc + rc);
    return { bottomSeg: b, leftSeg: l, topSeg: t, rightSeg: r };
  }, [path]);

  const activeIndex = Number.isFinite(Number(student?.currentPosition))
    ? Number(student.currentPosition)
    : -1;

  const sideTiles = useMemo(() => {
    const tiles = { bottom: [], left: [], top: [], right: [] };
    let idx = 0;

    bottomSeg.forEach((cell, i) => {
      const globalIndex = idx + i;
      const color = colorFor(cell.name, globalIndex);
      tiles.bottom.push(
        <TileHorizontal
          key={`b-${i}`}
          label={cell.name}
          reward={cell.reward}
          orientation="top"
          color={color}
          active={globalIndex === activeIndex}
        />
      );
    });
    tiles.bottom = tiles.bottom.reverse();
    idx += bottomSeg.length;

    const leftChunk = [];
    leftSeg.forEach((cell, i) => {
      const globalIndex = idx + i;
      const color = colorFor(cell.name, globalIndex);
      leftChunk.push(
        <TileVertical
          key={`l-${i}`}
          label={cell.name}
          reward={cell.reward}
          orientation="right"
          color={color}
          active={globalIndex === activeIndex}
        />
      );
    });
    tiles.left = leftChunk.reverse();
    idx += leftSeg.length;

    topSeg.forEach((cell, i) => {
      const globalIndex = idx + i;
      const color = colorFor(cell.name, globalIndex);
      tiles.top.push(
        <TileHorizontal
          key={`t-${i}`}
          label={cell.name}
          reward={cell.reward}
          orientation="bottom"
          color={color}
          active={globalIndex === activeIndex}
        />
      );
    });
    idx += topSeg.length;

    rightSeg.forEach((cell, i) => {
      const globalIndex = idx + i;
      const color = colorFor(cell.name, globalIndex);
      tiles.right.push(
        <TileVertical
          key={`r-${i}`}
          label={cell.name}
          reward={cell.reward}
          orientation="left"
          color={color}
          active={globalIndex === activeIndex}
        />
      );
    });

    return tiles;
  }, [bottomSeg, leftSeg, topSeg, rightSeg, activeIndex]);

  const counts = useMemo(
    () => ({
      bottom: bottomSeg.length || 1,
      left: leftSeg.length || 1,
      top: topSeg.length || 1,
      right: rightSeg.length || 1,
    }),
    [bottomSeg, leftSeg, topSeg, rightSeg]
  );

  // Task lists
  const completedSet = useMemo(() => {
    const s = new Set();
    if (Array.isArray(student?.completedTasks)) {
      for (const t of student.completedTasks) {
        if (Number.isFinite(Number(t.taskIndex))) s.add(Number(t.taskIndex));
      }
    }
    return s;
  }, [student]);

  const remainingTasks = useMemo(
    () =>
      tasks.map((t, i) => ({ i, ...t })).filter((t) => !completedSet.has(t.i)),
    [tasks, completedSet]
  );
  const completedTasks = useMemo(
    () =>
      tasks.map((t, i) => ({ i, ...t })).filter((t) => completedSet.has(t.i)),
    [tasks, completedSet]
  );

  // Calculate viewport transform to focus on active tile
  const calculateTilePosition = (index) => {
    if (index < 0) return null;
    
    const boardWidth = 900;
    const boardHeight = 900;
    const cornerSize = 120;
    
    let x = 0, y = 0;
    
    const [bc, lc, tc, rc] = splitCounts(path.length);
    
    // Calculate dynamic tile sizes for each side
    const bottomTileWidth = (boardWidth - 2 * cornerSize) / (bc || 1);
    const leftTileHeight = (boardHeight - 2 * cornerSize) / (lc || 1);
    const topTileWidth = (boardWidth - 2 * cornerSize) / (tc || 1);
    const rightTileHeight = (boardHeight - 2 * cornerSize) / (rc || 1);
    
    if (index < bc) {
      // Bottom row: index 0 is at bottom-right (near START), moving left
      // In the DOM they're reversed, so position 0 is rightmost
      const posInBottom = index;
      x = boardWidth - cornerSize - (posInBottom * bottomTileWidth) - (bottomTileWidth / 2);
      y = boardHeight - 60; // Center of bottom tile strip (120px height, so 60px from bottom)
    } else if (index < bc + lc) {
      // Left column: moving up from bottom-left corner
      const posInLeft = index - bc;
      x = 60; // Center of left tile strip
      y = boardHeight - cornerSize - (posInLeft * leftTileHeight) - (leftTileHeight / 2);
    } else if (index < bc + lc + tc) {
      // Top row: moving right from top-left corner
      const posInTop = index - bc - lc;
      x = cornerSize + (posInTop * topTileWidth) + (topTileWidth / 2);
      y = 60; // Center of top tile strip (120px height, so 60px from top)
    } else {
      // Right column: moving down from top-right corner
      const posInRight = index - bc - lc - tc;
      x = boardWidth - 60; // Center of right tile strip
      y = cornerSize + (posInRight * rightTileHeight) + (rightTileHeight / 2);
    }
    
    return { x, y };
  };

  const viewportTransform = useMemo(() => {
    if (!zoomEnabled || activeIndex < 0) {
      return 'scale(1)';
    }
    
    const tilePos = calculateTilePosition(activeIndex);
    console.log('Active Index:', activeIndex);
    console.log('Tile Position:', tilePos);
    console.log('Path Length:', path.length);
    
    if (!tilePos) {
      return 'scale(1)';
    }
    
    // Scale factor for zoom
    const zoomScale = 2.2;
    
    // We want to center the tile in the 900x900 viewport
    // With origin-top-left, we need to:
    // 1. Translate so the tile moves to center of viewport (450, 450)
    // 2. Scale from that point
    
    // Calculate where the tile should be after scaling
    // The tile at (tilePos.x, tilePos.y) needs to end up at (450, 450) after transform
    const viewportCenterX = 450;
    const viewportCenterY = 450;
    
    // translateX + tilePos.x * scale = viewportCenterX
    // translateX = viewportCenterX - (tilePos.x * scale)
    const translateX = viewportCenterX - (tilePos.x * zoomScale);
    const translateY = viewportCenterY - (tilePos.y * zoomScale);
    
    console.log('Transform:', `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`);
    
    return `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`;
  }, [activeIndex, path.length, zoomEnabled]);

  if (loading)
    return <div className="text-sm text-slate-600">Loading board…</div>;
  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!path.length)
    return (
      <div className="text-sm text-slate-600">
        No <code>pathVector</code> found in course.
      </div>
    );

  const snapFor = (idx) =>
    Array.isArray(student?.completedTasks)
      ? student.completedTasks.find((t) => t.taskIndex === idx)
      : null;

  // Roll die handler with tiny animation
  const rollPendingDie = async () => {
    if (!student?.pendingCompletion) return;
    try {
      setLastRoll(null);
      setRolling(true);
      setRollFace(1);
      if (rollTimer.current) clearInterval(rollTimer.current);
      rollTimer.current = setInterval(
        () => setRollFace((f) => (f % 6) + 1),
        90
      );

      const res = await fetch("http://localhost:8000/api/student/roll-die", {
        method: "POST",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Roll failed (${res.status})`);
      }
      const data = await res.json();
      const rolled = data?.die?.roll ?? null;

      if (rolled != null) {
        setTimeout(() => {
          setRollFace(rolled);
          // keep a local snapshot so the panel doesn't vanish
          setLastRoll({
            roll: rolled,
            min: data?.die?.min ?? null,
            reward: data?.rewardGained ?? 0,
          });

          setTimeout(async () => {
            setRolling(false);
            if (rollTimer.current) clearInterval(rollTimer.current);
            setToast(`Rolled ${rolled} • +${data?.rewardGained ?? 0} ⭐`);
            setTimeout(() => setToast(""), 2500);
            await fetchAll(); // this clears pendingCompletion (OK now)
            // optional: auto-hide the last roll after a few seconds
            setTimeout(() => setLastRoll(null), 4000);
          }, 600);
        }, 300);
      } else {
        setRolling(false);
        if (rollTimer.current) clearInterval(rollTimer.current);
        await fetchAll();
      }
    } catch (e) {
      setRolling(false);
      if (rollTimer.current) clearInterval(rollTimer.current);
      setToast(e.message || "Failed to roll");
      setTimeout(() => setToast(""), 2500);
    }
  };

  const pending = student?.pendingCompletion || null;

  return (
    <div className="relative flex items-start gap-8 max-w-[1600px] mx-auto">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow">
          {toast}
        </div>
      )}

      {/* Floating Zoom Toggle Button - top left outside of board */}
      <button
        onClick={() => setZoomEnabled(!zoomEnabled)}
        className={`fixed top-[2%] left-[2%] z-50 rounded-lg px-4 py-2 font-semibold shadow-lg transition-all hover:scale-105 ${
          zoomEnabled
            ? 'bg-sky-600 text-white hover:bg-sky-700'
            : 'bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-50'
        }`}
        title={zoomEnabled ? 'Click to zoom out' : 'Click to zoom in'}
      >
        {zoomEnabled ? '🔍 Zoomed In' : '🔍 Zoomed Out'}
      </button>

      {/* BOARD CONTAINER with viewport transform */}
      <div className="relative w-[900px] h-[900px] overflow-visible shrink-0">
        
        <div 
          className="origin-top-left transition-transform duration-700 ease-out"
          style={{ transform: viewportTransform }}
        >
          {/* BOARD (left) */}
          <div className="relative bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 w-[900px] h-[900px] border-[12px] border-slate-700 rounded-[36px] shadow-[0_28px_80px_rgba(15,23,42,0.9)] overflow-visible">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_50px_rgba(15,23,42,0.35)]" />
            {/* Corners */}
            <div className="absolute top-0 left-0 w-[120px] h-[120px] border border-slate-400 bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center text-center px-2 z-20">
              <div className="text-[11px] leading-tight text-slate-800">
                <div className="font-black text-lg mb-1 tracking-tight">
                  AI
                  <br />
                  VIOLATION
                </div>
                <div className="text-[10px] text-slate-600">
                  (Go to "Crime
                  <br />
                  Committed")
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-[120px] h-[120px] border border-slate-400 bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center text-center px-2 z-20">
              <div className="text-[11px] leading-tight text-slate-800">
                <div className="font-black text-lg mb-1 tracking-tight">
                  HEALTH
                  <br />
                  ISSUE
                </div>
            <div className="text-[10px] text-slate-600">
              (Free
              <br />
              Parking)
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-[120px] h-[120px] border border-slate-400 bg-gradient-to-t from-slate-100 to-slate-50 flex items-center justify-center text-center z-20">
          <div className="font-bold text-base leading-tight tracking-tight text-slate-800">
            (Just
            <br />
            Visiting)
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-[120px] h-[120px] border border-slate-400 bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600 flex flex-col items-center justify-center text-center text-white shadow-inner z-20">
          <div className="font-semibold text-[11px] tracking-[0.18em] uppercase">
            Collect
            <br />
            Stipend
          </div>
          <div className="mt-1 text-3xl font-black tracking-wide">START</div>
          <div className="mt-1 text-2xl animate-pulse">⬅</div>
        </div>

        {/* Center content */}
        <div className="absolute inset-28 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-[32px] shadow-inner border border-slate-200/70 overflow-hidden">
          {!student ? (
            // Show logo when no student (game not started)
            <div className="w-full h-full flex items-center justify-center">
              <div className="-rotate-12 text-center drop-shadow-sm">
                <div className="text-6xl font-black tracking-[0.25em] text-[#005bbb] uppercase">
                  UB
                </div>
                <div className="mt-6 text-6xl font-black tracking-[0.25em] text-[#005bbb] uppercase">
                  TYCOON
                </div>
                <div className="mt-6 text-6xl font-black tracking-[0.25em] text-sky-900 uppercase flex justify-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Buffalo_Bulls_logo.svg/1280px-Buffalo_Bulls_logo.svg.png" alt="ub-logo" className="w-[25%]"/>
                </div>
              </div>
            </div>
          ) : (
            // Show git on left, Chatbot on right when game started
            <div className="w-full h-full grid grid-cols-2">
              {/* Left half - Victor 3D */}
              <div className="relative">
                <CenterVictor />
              </div>
              {/* Right half - Chatbot */}
              <div className="relative p-4">
                <Chatbot />
              </div>
            </div>
          )}
        </div>

        {/* Sides */}
        <div
          className="absolute bottom-0 z-10"
          style={{ 
            left: "13.33%", 
            right: "13.33%",
            height: "13.33%"
          }}
        >
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${counts.bottom}, 1fr)`,
              gap: 0,
            }}
          >
            {sideTiles.bottom}
          </div>
        </div>
        <div
          className="absolute top-0 z-10"
          style={{ 
            left: "13.33%", 
            right: "13.33%",
            height: "13.33%"
          }}
        >
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${counts.top}, 1fr)`,
              gap: 0,
            }}
          >
            {sideTiles.top}
          </div>
        </div>
        <div 
          className="absolute left-0 z-10"
          style={{
            top: "13.33%",
            bottom: "13.33%",
            width: "13.33%"
          }}
        >
          <div
            className="w-full h-full grid"
            style={{ gridTemplateRows: `repeat(${counts.left}, 1fr)`, gap: 0 }}
          >
            {sideTiles.left}
          </div>
        </div>
        <div 
          className="absolute right-0 z-10"
          style={{
            top: "13.33%",
            bottom: "13.33%",
            width: "13.33%"
          }}
        >
          <div
            className="w-full h-full grid"
            style={{ gridTemplateRows: `repeat(${counts.right}, 1fr)`, gap: 0 }}
          >
            {sideTiles.right}
          </div>
        </div>
      </div>
      {/* Close the transform wrapper */}
      </div>
      {/* Close the viewport container */}
      </div>

      {/* PANELS (right) */}
      <aside className="flex-1 min-w-[450px] max-w-[600px]">
        <div className="sticky top-6 space-y-4">
          {/* Student Stats + Die Ready */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Student Stats
              </h3>
              <button
                onClick={fetchAll}
                className="text-xs rounded-md border px-2 py-1 bg-white hover:bg-slate-50"
                title="Refresh"
              >
                Refresh
              </button>
            </div>

            {!student ? (
              <div className="mt-3 text-sm text-slate-600">
                No student yet.
                <div className="mt-2">
                  <button
                    onClick={initStudent}
                    className="rounded-md bg-sky-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-sky-700"
                  >
                    Init Student
                  </button>
                </div>
              </div>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Position</dt>
                    <dd className="font-semibold text-slate-900">
                      {Number.isFinite(activeIndex) && activeIndex >= 0
                        ? activeIndex
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Total Reward</dt>
                    <dd className="font-semibold text-slate-900">
                      {student.totalReward ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tiles</dt>
                    <dd className="font-semibold text-slate-900">
                      {path.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Completed</dt>
                    <dd className="font-semibold text-slate-900">
                      {completedTasks.length}
                    </dd>
                  </div>
                </dl>

                {/* Die Ready card */}
                {(student.pendingCompletion || lastRoll) && (
                  <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3">
                    {student.pendingCompletion ? (
                      // --- Pending die UI ---
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <div className="font-semibold text-sky-900">
                              Die Ready • min {student.pendingCompletion.dieMin}
                            </div>
                            <div className="text-slate-700">
                              Task #{student.pendingCompletion.taskIndex} —{" "}
                              {student.pendingCompletion.title || "Task"}
                            </div>
                          </div>
                          <button
                            onClick={rollPendingDie}
                            className="rounded-md bg-sky-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
                            disabled={rolling}
                          >
                            Roll Die
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg border border-slate-300 bg-white grid place-items-center text-xl font-black">
                            {rollFace}
                          </div>
                          <div className="text-xs text-slate-600">
                            {rolling ? "Rolling…" : "Press roll to advance"}
                          </div>
                        </div>
                      </>
                    ) : (
                      // --- Last roll snapshot (after pending cleared by server) ---
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-sky-900">
                            Last roll: {lastRoll.roll}{" "}
                            {lastRoll.min ? `(min ${lastRoll.min})` : ""}
                          </div>
                          <div className="text-xs text-slate-700">
                            Reward gained: {lastRoll.reward} ⭐
                          </div>
                        </div>
                        <button
                          onClick={() => setLastRoll(null)}
                          className="rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tasks Panel */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Tasks</h3>
              <div className="text-xs text-slate-500">
                {completedTasks.length}/{tasks.length} completed
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">
                No tasks defined on the course.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4">
                {/* Remaining */}
                <div>
                  <div className="text-xs font-semibold text-emerald-700 mb-2">
                    Remaining
                  </div>
                  {remainingTasks.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      All caught up 🎉
                    </div>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                      {remainingTasks.map((t) => (
                        <li
                          key={t.i}
                          className="rounded-lg border border-slate-200 p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                #{t.i} — {t.title || "Task"}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-600">
                                Type: {t.type}{" "}
                                {t.points != null && `• Points: ${t.points}`}{" "}
                                {t.dueDate &&
                                  `• Due: ${new Date(
                                    t.dueDate
                                  ).toLocaleDateString()}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  await fetch(
                                    "http://localhost:8000/api/student/complete-task",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        taskIndex: t.i,
                                        advanceBy: 1,
                                      }),
                                    }
                                  );
                                  await fetchAll();
                                }}
                                className="shrink-0 rounded-md bg-slate-200 text-slate-800 px-2 py-1 text-xs font-semibold hover:bg-slate-300"
                                title="Quick complete (advance +1)"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => openCompleteModal(t)}
                                className="shrink-0 rounded-md bg-sky-600 text-white px-2 py-1 text-xs font-semibold hover:bg-sky-700"
                                title="Complete with score (store die)"
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Completed */}
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Completed
                  </div>
                  {completedTasks.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      No tasks completed yet.
                    </div>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                      {completedTasks.map((t) => {
                        const snap = snapFor(t.i);
                        const pct =
                          typeof snap?.scorePercent === "number"
                            ? Math.round(snap.scorePercent)
                            : null;
                        const scoreLine =
                          snap?.scoreObtained != null && t.points != null
                            ? ` • Score: ${snap.scoreObtained}/${t.points}${
                                pct != null ? ` (${pct}%)` : ""
                              }`
                            : pct != null
                            ? ` • Score: ${pct}%`
                            : "";
                        const dieLine =
                          snap?.dieMinUsed != null || snap?.dieRollUsed != null
                            ? ` • Die: min ${snap?.dieMinUsed ?? "?"}, roll ${
                                snap?.dieRollUsed ?? "?"
                              }`
                            : snap?.advanceByUsed != null
                            ? ` • Advanced: ${snap.advanceByUsed}`
                            : "";
                        return (
                          <li
                            key={t.i}
                            className="rounded-lg border border-slate-200 p-2 bg-slate-50"
                          >
                            <div className="text-sm font-semibold text-slate-900 line-through">
                              #{t.i} — {t.title || "Task"}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-600">
                              Type: {t.type}{" "}
                              {t.points != null && `• Points: ${t.points}`}{" "}
                              {t.dueDate &&
                                `• Due: ${new Date(
                                  t.dueDate
                                ).toLocaleDateString()}`}
                              {scoreLine}
                              {dieLine}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* COMPLETE TASK MODAL */}
      {modalOpen && modalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeCompleteModal}
          />
          <div className="relative z-10 w-[520px] max-w-[92vw] rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  Complete Task #{modalTask.i} — {modalTask.title || "Task"}
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  Enter{" "}
                  {Number.isFinite(Number(modalTask.points))
                    ? "score obtained"
                    : "percent (0–100)"}{" "}
                  {Number.isFinite(Number(modalTask.points)) && (
                    <>
                      out of{" "}
                      <span className="font-semibold">{modalTask.points}</span>
                    </>
                  )}
                  . We’ll save your die chance; you’ll roll it explicitly.
                </p>
              </div>
              <button
                onClick={closeCompleteModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                title="Close"
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                {Number.isFinite(Number(modalTask.points))
                  ? "Score obtained"
                  : "Percent"}
              </label>
              <input
                type="number"
                step="any"
                min={0}
                max={
                  Number.isFinite(Number(modalTask.points))
                    ? modalTask.points
                    : 100
                }
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder={
                  Number.isFinite(Number(modalTask.points))
                    ? "e.g., 18"
                    : "e.g., 92"
                }
              />
            </div>

            {submitMsg && (
              <div className="mt-3 text-sm text-red-600">{submitMsg}</div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeCompleteModal}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={submitCompletion}
                disabled={submitting}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save & Prepare Die"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
