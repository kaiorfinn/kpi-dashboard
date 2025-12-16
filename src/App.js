import { useEffect, useMemo, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   HELPERS
============================= */
const getMonthKey = ts => {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function App() {
  /* =============================
     AUTH
  ============================= */
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  /* =============================
     DATA
  ============================= */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
     FORM
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
  const [savingRowId, setSavingRowId] = useState(null);

  /* =============================
     FETCH
  ============================= */
  const fetchData = async key => {
    setLoading(true);
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
     DERIVED
  ============================= */
  const submissions = useMemo(() => {
    if (!data?.submissionHistory) return [];
    return data.submissionHistory.map(s => ({
      ...s,
      _month: getMonthKey(s.Timestamp),
      _decision: s.Manager_Decision || ""
    }));
  }, [data]);

  const pendingApprovals = useMemo(() => {
    if (!data || data.userInfo.role !== "Admin") return [];
    return submissions.filter(s => !s._decision);
  }, [data, submissions]);

  /* =============================
     LOGIN SCREEN
  ============================= */
  if (!authKey) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 420, padding: 32, border: "1px solid #ddd" }}>
          <h2>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchData(loginKey)}
            style={{ width: "100%", padding: 10 }}
          />
          <button onClick={() => fetchData(loginKey)} style={{ marginTop: 12, width: "100%" }}>
            Login
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  const isAdmin = data.userInfo.role === "Admin";

  /* =============================
     UI
  ============================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>
      <p>User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})</p>
      <button onClick={() => { localStorage.removeItem("authKey"); window.location.reload(); }}>
        Log out
      </button>

      {/* KPIs */}
      <h3 style={{ marginTop: 32 }}>KPIs</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        {data.kpis.map(k => (
          <div key={k.KPI_ID} style={{ border: "1px solid #ddd", padding: 16 }}>
            <strong>{k.KPI_Name}</strong>
            <div style={{ fontSize: 13 }}>Owner: {k.Assigned_User}</div>
            <div>{k.Description}</div>
            <div style={{ background: "#eee", height: 8, marginTop: 8 }}>
              <div style={{ width: `${k.Completion || 0}%`, height: "100%", background: "#16a34a" }} />
            </div>
            <div>Completion: {k.Completion || 0}%</div>
          </div>
        ))}
      </div>

      {/* ADMIN APPROVALS */}
      {isAdmin && (
        <>
          <h3 style={{ marginTop: 40 }}>Pending Approvals</h3>
          {pendingApprovals.map(s => {
            const draft = feedbackDraft[s.ROW_ID] || {};
            return (
              <div key={s.ROW_ID} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
                <strong>{s.Name}</strong> | KPI {s.KPI_ID}
                <div>Submitted: {s.Progress_Percent}%</div>
                <input
                  type="number"
                  value={draft.adjusted ?? s.Progress_Percent}
                  onChange={e =>
                    setFeedbackDraft({ ...feedbackDraft, [s.ROW_ID]: { ...draft, adjusted: e.target.value } })
                  }
                />
                <textarea
                  placeholder="Manager feedback"
                  value={draft.feedback || ""}
                  onChange={e =>
                    setFeedbackDraft({ ...feedbackDraft, [s.ROW_ID]: { ...draft, feedback: e.target.value } })
                  }
                />
                <button onClick={() => submitFeedback(s, "Approved", Number(draft.adjusted))}>Approve</button>
                <button onClick={() => submitFeedback(s, "Rejected", 0)}>Reject</button>
              </div>
            );
          })}
        </>
      )}

      {/* SUBMIT UPDATE */}
      <h3 style={{ marginTop: 40 }}>Submit Update</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={selectedKPI} onChange={e => setSelectedKPI(e.target.value)}>
          <option value="">Select KPI</option>
          {data.kpis.map(k => <option key={k.KPI_ID} value={k.KPI_ID}>{k.KPI_Name}</option>)}
        </select>
        <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
          <option>In Progress</option>
          <option>Done</option>
        </select>
        <input type="number" placeholder="Progress %" value={progressPercent} onChange={e => setProgressPercent(e.target.value)} />
        <textarea placeholder="Today" value={focusToday} onChange={e => setFocusToday(e.target.value)} />
        <textarea placeholder="Blockers" value={blockers} onChange={e => setBlockers(e.target.value)} />
        <textarea placeholder="Tomorrow" value={focusTomorrow} onChange={e => setFocusTomorrow(e.target.value)} />
        <button onClick={submitUpdate}>Submit</button>
      </div>

      {/* SUBMISSION HISTORY — ALWAYS LAST */}
      <h3 style={{ marginTop: 40 }}>Submission History</h3>
      <table width="100%" cellPadding="6">
        <thead>
          <tr>
            <th>Time</th>
            <th>Name</th>
            <th>KPI</th>
            <th>Submitted</th>
            <th>Adjusted</th>
            <th>Decision</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.ROW_ID}>
              <td>{s.Timestamp}</td>
              <td>{s.Name}</td>
              <td>{s.KPI_ID}</td>
              <td>{s.Progress_Percent}%</td>
              <td>{s.Manager_Adjusted_Progress || "-"}</td>
              <td>{s.Manager_Decision || "Pending"}</td>
              <td>{s.Manager_Feedback || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
