// ProfilePage.jsx
import React, { useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const UB = {
  blue: "#005BBB",
  harriman: "#002F56",
  gray: "#666666",
  grayLight: "#E4E4E4",
  yellow: "#FFC72C",
  sky: "#2F9FD0",
};

const pill = (bg, fg = UB.harriman, bd) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: fg,
  background: bg,
  border: bd ? `1px solid ${bd}` : "none",
});

function getInitials(name = "") {
  const s = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
  return s || "UB";
}

function extractRoles(user) {
  if (!user) return [];
  for (const k of Object.keys(user)) {
    if (k.toLowerCase().endsWith("/roles") || k.toLowerCase() === "roles") {
      const v = user[k];
      return Array.isArray(v) ? v.map(String) : [];
    }
  }
  return [];
}

const Claim = ({ label, value }) => {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-xl bg-white p-3" style={{ border: `1px solid ${UB.grayLight}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: UB.gray }}>
        {label}
      </div>
      <div className="mt-1 text-sm" style={{ color: UB.harriman, wordBreak: "break-all" }}>
        {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth0();

  const roles = useMemo(() => extractRoles(user), [user]);
  const name = user?.name || user?.nickname || "User";
  const email = user?.email || "—";
  const provider = (user?.sub || "").split("|")[0] || "auth0";
  const picture = user?.picture;
  const emailVerified = !!user?.email_verified;
  const updatedAt = user?.updated_at || user?.created_at || null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: UB.grayLight,
            background:
              `radial-gradient(42rem 42rem at 95% -10%, ${UB.sky}22, transparent),` +
              `radial-gradient(36rem 36rem at 5% 110%, ${UB.blue}14, transparent)`,
          }}
        >
          <div className="animate-pulse h-6 w-40 rounded-md mb-4" style={{ background: `${UB.blue}22` }} />
          <div className="animate-pulse h-24 w-full rounded-md" style={{ background: `${UB.blue}14` }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold" style={{ color: UB.harriman }}>Profile</h2>
        <p className="mt-2 text-sm" style={{ color: UB.gray }}>You’re not signed in.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header card */}
      <section
        className="rounded-2xl border p-6 md:p-8"
        style={{
          borderColor: UB.grayLight,
          background:
            `radial-gradient(42rem 42rem at 95% -10%, ${UB.sky}22, transparent),` +
            `radial-gradient(36rem 36rem at 5% 110%, ${UB.blue}14, transparent)`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar (no <img> to avoid Next rule) */}
          <div
            className="h-20 w-20 rounded-2xl grid place-items-center text-2xl font-black text-white"
            style={{
              background: UB.blue,
              border: `2px solid ${UB.grayLight}`,
              backgroundImage: picture ? `url(${picture})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!picture && getInitials(name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-2xl font-extrabold" style={{ color: UB.harriman }}>{name}</h2>
              {roles[0] && <span style={pill(UB.yellow, UB.harriman, UB.harriman)}>{roles[0]}</span>}
              {emailVerified && <span style={pill("#E6F7F2", "#0F766E", "#99F6E4")}>Email Verified</span>}
            </div>
            <div className="mt-1 text-sm" style={{ color: UB.gray }}>{email}</div>
            <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: UB.gray }}>
              <span style={pill(`${UB.blue}14`, UB.harriman, UB.grayLight)}>{provider.toUpperCase()}</span>
              {updatedAt && <span>Last updated: {new Date(updatedAt).toLocaleString()}</span>}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-3 text-center" style={{ border: `1px solid ${UB.grayLight}` }}>
            <div className="text-xs font-semibold" style={{ color: UB.gray }}>Provider</div>
            <div className="text-sm font-bold" style={{ color: UB.harriman }}>{provider}</div>
          </div>
          <div className="rounded-xl bg-white p-3 text-center" style={{ border: `1px solid ${UB.grayLight}` }}>
            <div className="text-xs font-semibold" style={{ color: UB.gray }}>Email</div>
            <div className="text-sm font-bold" style={{ color: UB.harriman }}>{email}</div>
          </div>
          {/* <div className="rounded-xl bg-white p-3 text-center" style={{ border: `1px solid ${UB.grayLight}` }}>
            <div className="text-xs font-semibold" style={{ color: UB.gray }}>Roles</div>
            <div className="text-sm font-bold" style={{ color: UB.harriman }}>
              {roles.length ? roles.join(", ") : "—"}
            </div>
          </div> */}
        </div>
      </section>

      {/* Common claims */}
      <section>
        <h3 className="text-lg font-bold mb-3" style={{ color: UB.harriman }}>Account details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Claim label="sub" value={user?.sub} />
          <Claim label="nickname" value={user?.nickname} />
          <Claim label="given_name" value={user?.given_name} />
          <Claim label="family_name" value={user?.family_name} />
          <Claim label="locale" value={user?.locale} />
          <Claim label="updated_at" value={user?.updated_at} />
          <Claim label="created_at" value={user?.created_at} />
        </div>
      </section>

      {/* Raw JSON */}
      <section>
        <details className="rounded-xl bg-white" style={{ border: `1px solid ${UB.grayLight}` }}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold" style={{ color: UB.harriman }}>
            Raw profile JSON
          </summary>
          <div className="px-4 pb-4">
            <pre
              className="whitespace-pre-wrap text-xs rounded-lg p-3 overflow-x-auto"
              style={{ background: "#0B1020", color: "#E6EAF2", border: `1px solid #1F2A44` }}
            >
{JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </details>
      </section>
    </div>
  );
}
