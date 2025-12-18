import { useEffect, useMemo, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   UI STYLES
============================= */
const section = { marginTop: 40 };

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,.05)",
  position: "relative"
};

const expiredBadge = {
  position: "absolute",
  top: 10,
  right: 10,
  background: "#dc2626",
  color: "#fff",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600
};

/* =============================
   HELPERS
============================= */
const formatDateOnly = d => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date)) return "-";
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

const isExpired = k => {
  if (!k.CompletionDate) return false;
  if (String(k.KPI_Status || "").toLowerCase() === "done") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(k.CompletionDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
};

export default function App() {
  /* =============================
     AUTH
  ============================= */
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");

  /* =============================
     DATA
  ============================= */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
     SUBMIT FORM
  ============================= */
  const [selectedKPI, setSelectedKPI] = useState("");
  const [taskStatus, setTaskStatus] = useState("In Progress");
  const [progressPercent, setProgressPercent] = useState("");
  const [focusToday, setFocusToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [focusTomorrow, setFocusTomorrow] = useState("");

  /* =============================
     ADMIN
  ============================= */
  const [feedbackDraft, setFeedbackDraft] = useState({});

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
  const submissions = useMemo(
    () => data?.submissionHistory || [],
    [data]
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingTaskCount = submissions.filter(
    s => !s.Manager_Decision
  ).length;

  if (!authKey) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          fetchData(loginKey);
        }}
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ width: 420, padding: 32, border: "1px solid #ddd" }}>
          <h2>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
          <button type="submit" style={{ marginTop: 12, width: "100%" }}>
            Login
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </form>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  const dailyKPIs = data.kpis.filter(
    k => String(k.KPIType).toLowerCase() === "daily"
  );
  const weeklyKPIs = data.kpis.filter(
    k => String(k.KPIType).toLowerCase() === "weekly"
  );
  const monthlyKPIs = data.kpis.filter(
    k => String(k.KPIType).toLowerCase() === "monthly"
  );

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
        <div style={{ color: "red" }}>Today: {todayStr}</div>
        <div style={{ color: "red" }}>Pending Task: {pendingTaskCount}</div>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("authKey");
          window.location.reload();
        }}
      >
        Log out
      </button>

      {/* KPI SECTIONS */}
      {[
        ["Daily", dailyKPIs],
        ["Weekly", weeklyKPIs],
        ["Monthly", monthlyKPIs]
      ].map(([title, list]) => (
        <div key={title} style={section}>
          <h3>{title}</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16
            }}
          >
            {list.map(k => (
              <div key={k.KPI_ID} style={card}>
                {isExpired(k) && <div style={expiredBadge}>EXPIRED</div>}

                <div><strong>KPI Type:</strong> {k.KPIType}</div>
                <div>
                  <strong>Completion Date:</strong>{" "}
                  {formatDateOnly(k.CompletionDate)}
                </div>

                <div style={{ marginTop: 6 }}>
                  <strong>{k.KPI_Name}</strong>
                </div>

                <div style={{ fontSize: 13 }}>{k.Description}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* SUBMISSION HISTORY (UNCHANGED) */}
      <div style={section}>
        <h3>Submission History</h3>
        <table width="100%" cellPadding="10">
          <thead>
            <tr>
              {[
                "Time",
                "Name",
                "KPI",
                "Submitted",
                "Adjusted",
                "Decision",
                "Feedback",
                "Reviewed By"
              ].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s.ROW_ID}>
                <td>{formatDateOnly(s.Timestamp)}</td>
                <td>{s.Name}</td>
                <td>{s.KPI_ID}</td>
                <td>{s.Progress_Percent}%</td>
                <td>{s.Manager_Adjusted_Progress ?? "-"}</td>
                <td>{s.Manager_Decision || "Pending"}</td>
                <td>{s.Manager_Feedback || "-"}</td>
                <td>{s.Reviewed_By || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
