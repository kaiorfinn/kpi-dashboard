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
   SHARED CONTROL BASE (KEY FIX)
============================= */
const controlBase = {
  width: "100%",
  height: 52,
  borderRadius: 12,
  fontSize: 16,
  boxSizing: "border-box"
};

/* =============================
   UI STYLES
============================= */
const sectionDivider = {
  borderTop: "1px solid #e5e7eb",
  margin: "48px 0"
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 18,
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "10px 0"
};

const progressWrap = {
  height: 8,
  background: "#e5e7eb",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 8
};

const progressBar = (percent, expired) => ({
  width: `${percent}%`,
  height: "100%",
  background: expired ? "#ef4444" : "#22c55e"
});

const ownerRow = {
  display: "flex",
  alignItems: "center",
  gap: 8
};

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
      link.type = "image/png";
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

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingTaskCount = data
    ? data.kpis.filter(
        k =>
          Number(k.Completion) < 100 &&
          String(k.KPI_Status || "").toLowerCase() !== "done"
      ).length
    : 0;

  /* =============================
     LOGIN VIEW (FIXED)
  ============================= */
  if (!authKey) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!loginKey || loading) return;
          fetchData(loginKey);
        }}
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            padding: "48px 42px",
            borderRadius: 20,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 30px 60px rgba(15,23,42,0.12)",
            textAlign: "center"
          }}
        >
          <img
            src={ICON_LOGIN}
            alt="Login"
            style={{ width: 80, marginBottom: 28 }}
          />

          <h2 style={{ marginBottom: 24 }}>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            disabled={loading}
            onChange={e => setLoginKey(e.target.value)}
            style={{
              ...controlBase,
              padding: "0 16px",
              border: "1px solid #cbd5e1"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...controlBase,
              marginTop: 18,
              fontWeight: 600,
              background: "#f1f5f9",
              border: "2px solid #111827",
              cursor: "pointer"
            }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {error && (
            <p style={{ color: "#dc2626", marginTop: 16 }}>{error}</p>
          )}
        </div>
      </form>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  /* =============================
     DASHBOARD (UNCHANGED LOGIC)
  ============================= */
  const allKPIs = [...data.kpis].sort((a, b) =>
    String(a.Assigned_User).localeCompare(String(b.Assigned_User))
  );

  const dailyKPIs = allKPIs.filter(k => k.KPIType === "Daily");
  const weeklyKPIs = allKPIs.filter(k => k.KPIType === "Weekly");
  const monthlyKPIs = allKPIs.filter(k => k.KPIType === "Monthly");

  const isAdmin = data.userInfo.role === "Admin";
  const myName = data.userInfo.name;
  const headerIcon = isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;

  const splitByOwner = list => ({
    mine: list.filter(k => k.Assigned_User === myName),
    others: list.filter(k => k.Assigned_User !== myName)
  });

  const renderSection = (title, list) => {
    const { mine, others } = splitByOwner(list);

    const renderCards = items =>
      items.map(k => {
        const expired = isExpired(k);
        const completion = Number(k.Completion) || 0;
        const diff = daysDiff(k.CompletionDate);
        const ownerClr = nameColor(k.Assigned_User);

        return (
          <div key={k.KPI_ID} style={card}>
            <div style={{ fontWeight: 600, color: expired ? "#ef4444" : "#22c55e" }}>
              Status: {expired ? "EXPIRED" : "ACTIVE"}
            </div>

            <div><strong>Due:</strong> {formatDateOnly(k.CompletionDate)}</div>
            <div><strong>Due in:</strong> {diff} days</div>

            <div style={ownerRow}>
              <span>Owner:</span>
              <span style={ownerPill(ownerClr)}>{k.Assigned_User}</span>
            </div>

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
      <>
        <div style={sectionDivider} />
        <h3>{title}</h3>

        {isAdmin && mine.length > 0 && (
          <>
            <h4>Admin — My Tasks</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 18 }}>
              {renderCards(mine)}
            </div>
          </>
        )}

        <h4>{isAdmin ? "Employees — Team Tasks" : "Tasks"}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 18 }}>
          {renderCards(isAdmin ? others : list)}
        </div>
      </>
    );
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img
          src={headerIcon}
          alt="Role"
          style={{
            width: 52,
            height: 52,
            padding: 6,
            borderRadius: 14,
            background: "#ffffff",
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)"
          }}
        />
        <h2 style={{ margin: 0 }}>KPI Dashboard</h2>
      </div>

      <div style={{ display: "flex", gap: 60, marginTop: 16, marginBottom: 20 }}>
        <div>
          User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})
        </div>
        <div>Today: {todayStr}</div>
        <div>Pending Task: {pendingTaskCount}</div>
      </div>

      {renderSection("Daily", dailyKPIs)}
      {renderSection("Weekly", weeklyKPIs)}
      {renderSection("Monthly", monthlyKPIs)}
    </div>
  );
}
