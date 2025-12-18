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

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingTaskCount = data
    ? data.kpis.filter(
        k =>
          Number(k.Completion) < 100 &&
          String(k.KPI_Status || "").toLowerCase() !== "done"
      ).length
    : 0;

  /* =============================
     LOGIN VIEW (ICON FIXED)
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
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            textAlign: "center"
          }}
        >
          <img
            src={ICON_LOGIN}
            alt="Login"
            style={{
              width: 72,
              height: 72,
              marginBottom: 16
            }}
          />

          <h2 style={{ marginBottom: 12 }}>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            disabled={loading}
            onChange={e => setLoginKey(e.target.value)}
            style={{ width: "100%", padding: 12 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 16, width: "100%" }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}
        </div>
      </form>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  const isAdmin = data.userInfo.role === "Admin";
  const headerIcon = isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;

  /* =============================
     DASHBOARD HEADER (ICON FIXED)
  ============================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 12
        }}
      >
        <img
          src={headerIcon}
          alt="Role"
          style={{
            width: 44,
            height: 44
          }}
        />
        <h2 style={{ margin: 0 }}>KPI Dashboard</h2>
      </div>

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
    </div>
  );
}
