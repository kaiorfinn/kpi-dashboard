import { useEffect, useMemo, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   UI STYLES
============================= */
const sectionDivider = {
  borderTop: "2px solid #e5e7eb",
  margin: "40px 0"
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,.05)",
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "8px 0"
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
  background: expired ? "#dc2626" : "#16a34a"
});

const ownerRow = {
  display: "flex",
  alignItems: "center",
  gap: 6
};

const ownerPill = color => ({
  padding: "2px 10px",
  borderRadius: 999,
  background: color,
  color: "#fff",
  fontSize: 12,
  fontWeight: 500
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
     FAVICON + TITLE CONTROL
  ============================= */
  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";

    if (!data) {
      link.href = "/login.png";
      document.title = "KPI Dashboard – Login";
    } else if (data.userInfo.role === "Admin") {
      link.href = "/admin.png";
      document.title = `KPI Dashboard – ${data.userInfo.name} (Admin)`;
    } else {
      link.href = "/employee.png";
      document.title = `KPI Dashboard – ${data.userInfo.name} (Employee)`;
    }

    document.head.appendChild(link);
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
      setError("Invalid auth key");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* =============================
     DERIVED
  ============================= */
  const todayStr = new Date().toISOString().split("T")[0];

  /** ✅ CORRECT PENDING KPI LOGIC */
  const pendingTaskCount = data
    ? data.kpis.filter(
        k =>
          Number(k.Completion) < 100 &&
          String(k.KPI_Status || "").toLowerCase() !== "done"
      ).length
    : 0;

  /* =============================
     LOGIN
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb"
        }}
      >
        <div
          style={{
            width: 420,
            padding: 36,
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)"
          }}
        >
          <img
            src="/login.png"
            alt="Login"
            style={{ width: 48, marginBottom: 12 }}
          />
          <h2>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            disabled={loading}
            onChange={e => setLoginKey(e.target.value)}
            style={{ width: "100%", padding: 12, marginTop: 12 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 16, width: "100%" }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        </div>
      </form>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  /* =============================
     KPI GROUPING
  ============================= */
  const allKPIs = [...data.kpis].sort((a, b) =>
    String(a.Assigned_User).localeCompare(String(b.Assigned_User))
  );

  const dailyKPIs = allKPIs.filter(k => k.KPIType === "Daily");
  const weeklyKPIs = allKPIs.filter(k => k.KPIType === "Weekly");
  const monthlyKPIs = allKPIs.filter(k => k.KPIType === "Monthly");

  const isAdmin = data.userInfo.role === "Admin";
  const myName = data.userInfo.name;

  const splitByOwner = list => ({
    mine: list.filter(k => k.Assigned_User === myName),
    others: list.filter(k => k.Assigned_User !== myName)
  });

  /* =============================
     KPI SECTION
  ============================= */
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
            <div style={{ fontWeight: 600, color: expired ? "#dc2626" : "#16a34a" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
              {renderCards(mine)}
            </div>
          </>
        )}

        <h4>{isAdmin ? "Employees — Team Tasks" : "Tasks"}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {renderCards(isAdmin ? others : list)}
        </div>
      </>
    );
  };

  /* =============================
     UI
  ============================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>

      <div style={{ display: "flex", gap: 60, marginBottom: 16 }}>
        <div>
          User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})
        </div>
        <div>Today: {todayStr}</div>
        <div>Pending Task: {pendingTaskCount}</div>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("authKey");
          window.location.reload();
        }}
      >
        Log out
      </button>

      {renderSection("Daily", dailyKPIs)}
      {renderSection("Weekly", weeklyKPIs)}
      {renderSection("Monthly", monthlyKPIs)}
    </div>
  );
}
