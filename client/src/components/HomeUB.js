// HomeUBMonopolySection.jsx (quotes updated)
import React from "react";
import { Link } from "react-router-dom";

const BAR_COLORS = ["#005BBB", "#002F56", "#2F9FD0", "#00A69C", "#E56A54", "#FFC72C"];
function colorFor(label, idx) {
  const s = String(label ?? "") + "|" + idx;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const i = Math.abs(h) % BAR_COLORS.length;
  return BAR_COLORS[i];
}

const UB = {
  blue: "#005BBB",
  harriman: "#002F56",
  gray: "#666666",
  grayLight: "#E4E4E4",
  yellow: "#FFC72C",
  sky: "#2F9FD0",
};

function Die({ value = 5 }) {
  const dot = (l, t) => (
    <span
      key={`${l}-${t}`}
      style={{
        position: "absolute", width: 6, height: 6, borderRadius: 999,
        background: "#0A0A0A", left: l, top: t,
      }}
    />
  );
  const dots = {
    1: [dot("50%","50%")],
    2: [dot("25%","25%"), dot("75%","75%")],
    3: [dot("25%","25%"), dot("50%","50%"), dot("75%","75%")],
    4: [dot("25%","25%"), dot("25%","75%"), dot("75%","25%"), dot("75%","75%")],
    5: [dot("25%","25%"), dot("25%","75%"), dot("50%","50%"), dot("75%","25%"), dot("75%","75%")],
    6: [dot("25%","20%"), dot("25%","50%"), dot("25%","80%"), dot("75%","20%"), dot("75%","50%"), dot("75%","80%")],
  }[Math.min(6, Math.max(1, value))];

  return (
    <span
      style={{
        position: "relative", display: "inline-block", width: 36, height: 36,
        background: "#fff", border: "2px solid #111", borderRadius: 6, boxShadow: "0 2px 0 #111",
      }}
    >
      {dots}
    </span>
  );
}

function PropertyCard({ index = 0, name = "Capen Hall", rent = "Rent 10 pts" }) {
  const color = colorFor(name, index);
  return (
    <div className="rounded-xl bg-white" style={{ border: `2px solid ${UB.grayLight}`, boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
      <div style={{ background: color, height: 28, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
      <div className="p-3">
        <div className="text-sm font-bold uppercase tracking-wide" style={{ color: UB.harriman }}>{name}</div>
        <div className="mt-1 text-xs" style={{ color: UB.gray }}>{rent}</div>
      </div>
    </div>
  );
}

function ColorSetCard({ i = 0, title = "Color Set", items = [] }) {
  const band = BAR_COLORS[i % BAR_COLORS.length];
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: `2px solid ${UB.grayLight}` }}>
      <div className="h-2 w-full rounded-md" style={{ background: band }} />
      <div className="mt-3 text-sm font-bold uppercase tracking-wide" style={{ color: UB.harriman }}>
        {title}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((name, idx) => (
          <li
            key={name}
            className="flex items-center justify-between rounded-md px-2 py-1 text-xs"
            style={{ border: `1px solid ${UB.grayLight}`, backgroundColor: "#fff", color: UB.gray }}
          >
            <span>{name}</span>
            <span className="ml-2 inline-block h-3 w-8 rounded-sm" style={{ background: colorFor(name, idx) }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ticket({ label = "Chance", bg = "#FFA500", text = "#111", note = "" }) {
  return (
    <div
      className="relative rounded-xl p-4"
      style={{ background: bg, color: text, border: "2px solid #111", boxShadow: "0 3px 0 #111" }}
    >
      <div className="text-xs font-black uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-semibold">{note}</div>
      <span className="absolute left-[-8px] top-6 h-4 w-4 rounded-full bg-white border-2 border-[#111]" />
      <span className="absolute right-[-8px] top-6 h-4 w-4 rounded-full bg-white border-2 border-[#111]" />
    </div>
  );
}

function Corner({ title, subtitle, gradient = "from-slate-100 to-slate-50" }) {
  return (
    <div className={`rounded-2xl border p-4 text-center bg-gradient-to-b ${gradient}`} style={{ borderColor: "#cbd5e1" }}>
      <div className="text-[11px] leading-tight text-slate-800 font-black tracking-wide">{title}</div>
      {subtitle && <div className="mt-1 text-[10px] text-slate-600 leading-tight">{subtitle}</div>}
    </div>
  );
}

export default function HomeUB() {
  const featured = [
    { name: "Capen Hall", rent: "Rent 12 pts" },
    { name: "Harriman Hall", rent: "Rent 10 pts" },
    { name: "Ellicott", rent: "Rent 8 pts" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      {/* Board-edge frame in UB blue */}
      <div
        className="rounded-2xl p-[1px]"
        style={{
          background:
            `linear-gradient(90deg, ${UB.blue} 0 12px, transparent 12px) top repeat-x,` +
            `linear-gradient(90deg, ${UB.blue} 0 12px, transparent 12px) bottom repeat-x,` +
            `linear-gradient(0deg, ${UB.blue} 0 12px, transparent 12px) left repeat-y,` +
            `linear-gradient(0deg, ${UB.blue} 0 12px, transparent 12px) right repeat-y`,
          backgroundSize: "28px 12px, 28px 12px, 12px 28px, 12px 28px",
        }}
      >
        {/* HERO */}
        <section
          className="rounded-2xl border p-6 md:p-8"
          style={{
            borderColor: UB.grayLight,
            background:
              `radial-gradient(40rem 40rem at 90% -10%, ${UB.sky}22, transparent),` +
              `radial-gradient(35rem 35rem at 10% 110%, ${UB.blue}18, transparent)`,
          }}
        >
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ color: UB.blue, backgroundColor: `${UB.blue}14`, border: `1px solid ${UB.grayLight}` }}
              >
                “Complete assignments → roll the dice → earn ⭐”
              </span>

              <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl" style={{ color: UB.harriman }}>
                UB Monopoly
                <br />
                <span style={{ color: UB.blue }}>Own every deadline.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: UB.gray }}>
                Do the work, then roll. Higher grades raise your minimum roll — better odds of bigger rewards.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/board"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: UB.yellow, color: UB.harriman }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = UB.sky)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = UB.yellow)}
                >
                  <Die value={5} /> Start Playing
                </Link>

                <Link
                  to="/syllabus-form"
                  className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold"
                  style={{ color: UB.blue, borderColor: UB.blue, backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${UB.blue}14`)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Build Syllabus
                </Link>
              </div>
            </div>

            {/* Featured props */}
            <div className="w-full">
              <div className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: `1px solid ${UB.grayLight}` }}>
                <div
                  className="rounded-lg px-4 py-3 text-sm font-semibold"
                  style={{ backgroundColor: `${UB.blue}14`, color: UB.harriman, border: `1px solid ${UB.grayLight}` }}
                >
                  🏘️ Featured Properties
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  {featured.map((p, i) => (
                    <PropertyCard key={p.name} index={i} name={p.name} rent={p.rent} />
                  ))}
                </div>

                <div className="mt-4 text-center text-xs" style={{ color: UB.gray }}>
                  “High grades = higher minimum roll” — stack the odds in your favor ⭐
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-bold" style={{ color: UB.harriman }}>How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { title: "Complete Tasks", desc: "Finish assignments, quizzes, and projects to earn a roll." },
            { title: "Roll the Dice", desc: "Your grade boosts your minimum roll — better grades, better odds." },
            { title: "Collect Points", desc: "Land, collect ⭐, as you progress through the semester." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl bg-white p-4" style={{ border: `1px solid ${UB.grayLight}` }}>
              <div
                className="inline-block rounded-md px-2 py-1 text-xs font-semibold"
                style={{ color: UB.blue, backgroundColor: `${UB.blue}14`, border: `1px solid ${UB.grayLight}` }}
              >
                {s.title}
              </div>
              <p className="mt-2 text-sm" style={{ color: UB.gray }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MONOPOLY SHOWCASE */}
      <section
        className="rounded-2xl border p-6 md:p-8"
        style={{
          borderColor: UB.grayLight,
          background:
            `radial-gradient(48rem 48rem at 95% -10%, ${UB.sky}22, transparent),` +
            `radial-gradient(36rem 36rem at 5% 110%, ${UB.blue}14, transparent)`,
        }}
      >
        {/* Top rail */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-center">
          <Corner title="Work Hard" subtitle="(Stay sharp.)" />
          <div className="col-span-3 grid grid-cols-3 items-center gap-4">
            <div className="hidden md:flex items-center justify-center">
              {/* <StaticDie value={2} /> */}
            </div>
            {/* <BigGoArrow /> */}
            <div className="hidden md:flex items-center justify-center">
              {/* right die kept for balance */}
              <Die value={6} />
            </div>
          </div>
          <Corner title="Stay Consistent" subtitle="Catch your breath" />
        </div>

        {/* Tickets row */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Ticket
            label="Chance"
            bg="#FFA500"
            text="#111"
            note="Complete an assignment to roll the dice. Land to claim and earn ⭐."
          />
          <div className="rounded-2xl border p-4 text-center" style={{ borderColor: UB.grayLight, background: "#fff" }}>
            <div className="text-sm font-black tracking-wide" style={{ color: UB.harriman }}>
              Make Your Move
            </div>
            <p className="mt-1 text-xs" style={{ color: UB.gray }}>
              Complete assignments → roll the dice → earn ⭐. Higher grades raise your minimum roll for better outcomes.
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Link
                to="/board"
                className="rounded-lg px-4 py-2 text-xs font-bold"
                style={{ backgroundColor: UB.yellow, color: UB.harriman }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = UB.sky)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = UB.yellow)}
              >
                Start Playing
              </Link>
              <Link
                to="/syllabus-form"
                className="rounded-lg border px-4 py-2 text-xs font-semibold"
                style={{ color: UB.blue, borderColor: UB.blue }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${UB.blue}14`)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Build Properties
              </Link>
            </div>
          </div>
          <Ticket
            label="Learn from your Mascot!"
            bg="#FFE873"
            text="#111"
            note="Lean about your courses and progress from Victor E. Bull. 🐂"
          />
        </div>

        {/* Bottom rail */}
        <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-3">
          {["Quizzes", "Mid-Terms", "Homewords", "Assignments", "Labs", "Finals"].map(
            (name, i) => (
              <div key={name} className="rounded-xl bg-white" style={{ border: `2px solid ${UB.grayLight}`, boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
                <div style={{ background: colorFor(name, i), height: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                <div className="px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: UB.harriman }}>
                    {name}
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: UB.gray }}>
                    +⭐
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
