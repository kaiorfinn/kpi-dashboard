import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   GITHUB PAGES PATHS
============================= */
const BASE_PATH = "/kpi-dashboard";
const ICON_LOGIN = `${BASE_PATH}/login.png`;
const ICON_ADMIN = `${BASE_PATH}/admin.png`;
const ICON_EMPLOYEE = `${BASE_PATH}/employee.png`;

/* =============================
   UI STYLES (FUTURISTIC)
============================= */
const pageBg = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
  color: "#e5e7eb"
};

const glassCard = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 18,
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)"
};

const card = {
  ...glassCard,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "8px 0"
};

const sectionDivider = {
  borderTop: "2px solid rgba(255,255,255,0.15)",
  margin: "48px 0"
};

const progressWrap = {
  height: 8,
  background: "#e5e7eb",
  borderRadius: 6,
  overflow: "hidden",
  marginTop: 6
};

const progressBar = (percent, expired) => ({
  width: `${percent}%`,
  height: "100%",
  background: expired ? "#dc2626" : "#22c55e"
});

const ownerPill = color => ({
  padding: "4px 12px",
  borderRadius: 999,
  background: color,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600
});

/* =============================
   HELPERS
============================= */
const formatDateOnly = d => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date)) return "-";
  return date.toISOString().split("T")[0];
};

const daysDiff = d => {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
};

const isExpired = k => {
  if (!k.CompletionDate) return false;
  if (String(k.KPI_Status || "").toLowerCase() === "done") return false;
  return daysDiff(k.CompletionDate) < 0;
};

const nameColor = name => {
  const colors = ["#2563eb", "#7c3aed", "#0d9488", "#ea580c"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
};

/* =============================
   APP
============================= */
export default function App() {
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
     FAVICON + TITLE
  ============================= */
  useEffect(() => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (!data) {
      link.href = ICON_LOGIN;
      document.title = "KPI Dashboard – Login";
    } else if (data.userInfo.role === "Admin") {
      link.href = ICON_ADMIN;
      document.title = "KPI Dashboard – Admin";
    } else {
      link.href = ICON_EMPLOYEE;
      document.title = "KPI Dashboard – Employee";
    }
  }, [data]);

  /* =============================
     FETCH
  ============================= */
  const fetchData = async key => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?authKey=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      localStorage.setItem("authKey", key);
      setAuthKey(key);
      setData(json);
    } catch {
      localStorage.removeItem("authKey");
      setAuthKey("");
      setData(null);
      setError("Invalid auth key");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* =============================
     LOGIN VIEW
  ============================= */
  if (!authKey) {
    return (
      <div style={{ ...pageBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!loginKey || loading) return;
            fetchData(loginKey);
          }}
          style={{ ...glassCard, padding: 40, width: 420, textAlign: "center" }}
        >
          <img src={ICON_LOGIN} alt="Login" style={{ width: 80, marginBottom: 16 }} />
          <h2 style={{ color: "#020617" }}>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            disabled={loading}
            onChange={e => setLoginKey(e.target.value)}
            style={{ width: "100%", padding: 14, marginTop: 16 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 16, width: "100%", padding: 12 }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}
        </form>
      </div>
    );
  }

  if (loading || !data) {
    return <div style={{ ...pageBg, padding: 40 }}>Loading…</div>;
  }

  /* =============================
     DASHBOARD
  ============================= */
  const isAdmin = data.userInfo.role === "Admin";
  const headerIcon = isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;

  const pendingTaskCount = data.kpis.filter(
    k => Number(k.Completion) < 100 && String(k.KPI_Status || "").toLowerCase() !== "done"
  ).length;

  const todayStr = new Date().toISOString().split("T")[0];

  const renderCards = items =>
    items.map(k => {
      const expired = isExpired(k);
      const completion = Number(k.Completion) || 0;

      return (
        <div key={k.KPI_ID} style={card}>
          <strong style={{ color: expired ? "#dc2626" : "#16a34a" }}>
            {expired ? "EXPIRED" : "ACTIVE"}
          </strong>

          <div>Due: {formatDateOnly(k.CompletionDate)}</div>
          <div>Owner: <span style={ownerPill(nameColor(k.Assigned_User))}>{k.Assigned_User}</span></div>

          <div style={divider} />

          <strong>{k.KPI_Name}</strong>
          <div style={{ fontSize: 13 }}>{k.Description}</div>

          <div style={progressWrap}>
            <div style={progressBar(completion, expired)} />
          </div>

          <div style={{ fontSize: 12 }}>Progress: {completion}%</div>
        </div>
      );
    });

  return (
    <div style={{ ...pageBg, padding: 32 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={headerIcon}
            alt="Role"
            style={{
              width: 64,
              height: 64,
              padding: 8,
              borderRadius: 16,
              background: "rgba(255,255,255,0.85)",
              boxShadow: "0 12px 30px rgba(0,0,0,.35)"
            }}
          />
          <h1 style={{ margin: 0 }}>KPI Dashboard</h1>
        </div>

        <div style={{ display: "flex", gap: 48, marginTop: 16 }}>
          <div>User: <strong>{data.userInfo.name}</strong></div>
          <div>Today: {todayStr}</div>
          <div>Pending: {pendingTaskCount}</div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("authKey");
            window.location.reload();
          }}
          style={{ marginTop: 16 }}
        >
          Log out
        </button>

        <div style={sectionDivider} />
        <h3>All KPIs</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>
          {renderCards(data.kpis)}
        </div>
      </div>
    </div>
  );
}
