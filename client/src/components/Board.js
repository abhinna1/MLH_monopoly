import React from "react";

export default function Board({ tilesBySide = [9, 9, 9, 9] }) {
  // tilesBySide: [top, right, bottom, left] counts excluding corners

  // color choices for tile bars
  const BAR_COLORS = [
    "#D77506",
    "#10A6EA",
    "#B91C1C",
    "#23C560",
    "#065F46",
    "#0E7490",
  ];

  // thickness (in px) for the color bars
  const BAR_THICKNESS = 16;

  const pickColor = () =>
    BAR_COLORS[Math.floor(Math.random() * BAR_COLORS.length)];

  // pick a random color, optionally excluding the previous color to avoid repeats in a line
  const pickColorExcluding = (exclude) => {
    if (!exclude) return pickColor();
    const choices = BAR_COLORS.filter((c) => c !== exclude);
    if (choices.length === 0) return exclude; // fallback
    return choices[Math.floor(Math.random() * choices.length)];
  };

  // helper to make placeholder tiles
  // orientation: 'top' (bar at top edge) or 'bottom' (bar at bottom edge)
  const makeHorizontalTile = (
    label,
    price,
    key,
    orientation = "top",
    color
  ) => {
    const c = color || pickColor();
    const barStyle =
      orientation === "top"
        ? {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: BAR_THICKNESS,
            background: c,
          }
        : {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: BAR_THICKNESS,
            background: c,
          };

    const contentStyle =
      orientation === "top"
        ? { paddingTop: BAR_THICKNESS + 4 }
        : { paddingBottom: BAR_THICKNESS + 4 };

    return (
      <div
        key={key}
        className="border border-slate-400 h-[120px] flex flex-col bg-white/90"
        style={{ position: "relative" }}
      >
        <div style={barStyle} />
        <div
          className="flex-1 flex flex-col items-center justify-center text-[11px] text-center leading-tight text-slate-800"
          style={contentStyle}
        >
          <div className="font-medium">{label}</div>
          <div className="mt-2 font-semibold text-slate-900">{price}</div>
        </div>
      </div>
    );
  };

  // orientation: 'left' (bar on left side of tile) or 'right' (bar on right side of tile)
  const makeVerticalTile = (
    label,
    price,
    key,
    orientation = "right",
    color
  ) => {
    const c = color || pickColor();
    // place the vertical color bar according to orientation: left -> left edge, right -> right edge
    const barStyle =
      orientation === "left"
        ? {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: BAR_THICKNESS,
            background: c,
          }
        : {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: BAR_THICKNESS,
            background: c,
          };

    const contentStyle =
      orientation === "left"
        ? { paddingLeft: BAR_THICKNESS + 4 }
        : { paddingRight: BAR_THICKNESS + 4 };

    return (
      <div
        key={key}
        className="border border-slate-400 flex flex-col bg-white/90 h-full min-h-0"
        style={{ position: "relative" }}
      >
        <div style={barStyle} />
        <div
          className="flex-1 flex flex-col items-center justify-center text-[11px] text-center leading-tight text-slate-800"
          style={contentStyle}
        >
          <div className="font-medium">{label}</div>
          <div className="mt-2 font-semibold text-slate-900">{price}</div>
        </div>
      </div>
    );
  };

  // University at Buffalo building names (sample, taken from the board design)
  const BUILDINGS = [
    "Ellicott Complex",
    "Greiner Hall",
    "Furnas Hall",
    "Ketter Hall",
    "Bonner Hall",
    "Cooke Hall",
    "Park Hall",
    "Capen Hall",
    "Norton Hall",
    "O'Brian Hall",
    "Baird Hall",
    "Lockwood Library",
    "Slee Hall",
    "Alumni Arena",
    "Baldy Hall",
    "Center for the Arts",
    "One World Café",
    "Silverman Library",
    "Founders Plaza",
    "Clements Hall",
    "Talbert Hall",
    "The Commons",
    "Student Union",
    "Natural Sciences",
    "Knox Hall",
    "Davis Hall",
    "Bell Hall",
    "Jacobs Hall",
    "Hochstetter Hall",
  ];

  const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  const [topCount, rightCount, bottomCount, leftCount] = tilesBySide;
  const topNames = shuffle(BUILDINGS);
  const rightNames = shuffle(BUILDINGS);
  const bottomNames = shuffle(BUILDINGS);
  const leftNames = shuffle(BUILDINGS);

  // generate tiles while avoiding the same color in adjacent positions on the same side
  const topTiles = [];
  if (topCount > 0) {
    let prevColor = null;
    for (let i = 0; i < topCount; i++) {
      const color = pickColorExcluding(prevColor);
      topTiles.push(
        makeHorizontalTile(
          topNames[i % topNames.length],
          `$${(i + 1) * 10}`,
          `top-${i}`,
          "bottom",
          color
        )
      );
      prevColor = color;
    }
  }

  const rightTiles = [];
  if (rightCount > 0) {
    let prevColor = null;
    for (let i = 0; i < rightCount; i++) {
      const color = pickColorExcluding(prevColor);
      // right side tiles should have the color bar on their left (inside)
      rightTiles.push(
        makeVerticalTile(
          rightNames[i % rightNames.length],
          `$${(i + 1) * 10}`,
          `right-${i}`,
          "left",
          color
        )
      );
      prevColor = color;
    }
  }

  const bottomTiles = [];
  if (bottomCount > 0) {
    let prevColor = null;
    for (let i = 0; i < bottomCount; i++) {
      const color = pickColorExcluding(prevColor);
      bottomTiles.push(
        makeHorizontalTile(
          bottomNames[i % bottomNames.length],
          `$${(i + 1) * 10}`,
          `bottom-${i}`,
          "top",
          color
        )
      );
      prevColor = color;
    }
  }

  const leftTiles = [];
  if (leftCount > 0) {
    let prevColor = null;
    for (let i = 0; i < leftCount; i++) {
      const color = pickColorExcluding(prevColor);
      // left side tiles should have the color bar on their right (inside)
      leftTiles.push(
        makeVerticalTile(
          leftNames[i % leftNames.length],
          `$${(i + 1) * 10}`,
          `left-${i}`,
          "right",
          color
        )
      );
      prevColor = color;
    }
  }

  return (
      <div className="relative bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 w-[900px] h-[900px] border-[12px] border-slate-700 rounded-[36px] shadow-[0_28px_80px_rgba(15,23,42,0.9)] overflow-hidden">
        {/* Soft inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_50px_rgba(15,23,42,0.35)]" />

        {/* Four fixed corner tiles */}
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

        {/* Center */}
        <div className="absolute inset-28 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center rounded-[32px] shadow-inner border border-slate-200/70">
          <div className="-rotate-12 text-center drop-shadow-sm">
            <div className="text-6xl font-black tracking-[0.25em] text-sky-900 uppercase">
              ACADEMIC
            </div>
            <div className="mt-6 text-6xl font-black tracking-[0.25em] text-sky-900 uppercase">
              MONOPOLY
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-[120px] right-[120px] flex z-10"
          style={{ height: "120px" }}
        >
          <div
            className="flex-1 grid"
            style={{
              gridTemplateColumns: `repeat(${bottomCount || 1}, 1fr)`,
              gap: 0,
            }}
          >
            {bottomTiles}
          </div>
        </div>

        {/* Top row (middle tiles) */}
        <div
          className="absolute top-0 left-[120px] right-[120px] flex z-10"
          style={{ height: "120px" }}
        >
          <div
            className="flex-1 grid"
            style={{
              gridTemplateColumns: `repeat(${topCount || 1}, 1fr)`,
              gap: 0,
            }}
          >
            {topTiles}
          </div>
        </div>

        {/* Left side */}
        <div className="absolute left-0 top-[120px] bottom-[120px] flex z-10">
          <div
            className="w-[120px] h-full grid"
            style={{
              gridTemplateRows: `repeat(${leftCount || 1}, 1fr)`,
              gap: 0,
            }}
          >
            {leftTiles}
          </div>
        </div>

        {/* Right side */}
        <div className="absolute right-0 top-[120px] bottom-[120px] flex z-10">
          <div
            className="w-[120px] h-full grid"
            style={{
              gridTemplateRows: `repeat(${rightCount || 1}, 1fr)`,
              gap: 0,
            }}
          >
            {rightTiles}
          </div>
        </div>
      </div>
  );
}
