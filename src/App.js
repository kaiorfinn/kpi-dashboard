import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

export default function App() {
  /* =============================
   * AUTH
   * =========================== */
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  /* =============================
   * DATA
   * =========================== */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
   * FORM
   * =========================== */
  const [selectedKPI, setSelectedKPI] = useState("");
  const [taskStatus, setTaskStatus] = useState("In Progress");
  const [progressPercent, setProgressPercent] = useState("");
  const [focusToday, setFocusToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [focusTomorrow, setFocusTomorrow] = useState("");

  /* =============================
   * ADMIN
   * =========================== */
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [savingIndex, setSavingIndex] = useState(null);

  /* =============================
   * FETCH
   * =========================== */
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
      setError("Invalid auth key");
      localStorage.removeItem("authKey");
      setAuthKey("");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* =============================
   * LOGIN
   * =========================== */
  const handleLogin = async () => {
    if (!loginKey.trim()) return;
    setLoggingIn(true);
    await fetchData(loginKey);
    setLoggingIn(false);
  };

  /* =============================
   * SUBMIT UPDATE
   * =========================== */
  const submitUpdate = async () => {
    if (!selectedKPI) return alert("Select KPI");

    const finalProgress =
      taskStatus === "Done" ? 100 : Number(progressPercent) || 0;

    const kpi = data.kpis.find(k => String(k.KPI_ID) === String(selectedKPI));
    if (!kpi) return;

    setLoading(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authKey,
          action: "submit_update",
          payload: {
            kpi_id: selectedKPI,
            kpi_frequency: kpi.KPI_Frequency,
            task_status: taskStatus,
            progress_percent: finalProgress,
            focus_today: focusToday || "N/A",
            blockers: blockers || "N/A",
            focus_tomorrow: focusTomorrow || "N/A"
          }
        })
      });

      setSelectedKPI("");
      setProgressPercent("");
      setFocusToday("");
      setBlockers("");
      setFocusTomorrow("");
      setTaskStatus("In Progress");

      setTimeout(() => fetchData(authKey), 600);
    } finally {
      setLoading(false);
    }
  };

  /* =============================
   * ADMIN APPROVAL
   * =========================== */
  const submitFeedback = async (submission, index) => {
    const feedback = feedbackDraft[index] || "";
    if (!feedback.trim()) return alert("Enter feedback");

    setSavingIndex(index);
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authKey,
          action: "submit_feedback",
          payload: {
            kpi_id: submission.KPI_ID,
            feedback
          }
        })
      });

      setTimeout(() => fetchData(authKey), 600);
    } finally {
      setSavingIndex(null);
    }
  };

  /* =============================
   * LOGIN SCREEN
   * =========================== */
  if (!authKey) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 420, padding: 32, background: "#fff", borderRadius: 12 }}>
          <h2 style={{ textAlign: "center" }}>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Enter Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            disabled={loggingIn}
            style={{ width: "100%", padding: 12, marginBottom: 16 }}
          />
          <button onClick={handleLogin} disabled={loggingIn} style={{ width: "100%" }}>
            {loggingIn ? "Logging in…" : "Log in"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  const isAdmin = data.userInfo.role === "Admin";

  /* =============================
   * DASHBOARD
   * =========================== */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>
      <p>User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})</p>

      <button onClick={() => { localStorage.removeItem("authKey"); window.location.reload(); }}>
        Log out
      </button>

      {/* KPI CARDS */}
      <h3 style={{ marginTop: 30 }}>KPIs</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        {data.kpis.map(k => (
          <div key={k.KPI_ID} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <strong>{k.KPI_Name}</strong>
            <div>{k.Description}</div>
            <div style={{ height: 8, background: "#eee", marginTop: 8 }}>
              <div style={{
                width: `${k.Completion || 0}%`,
                height: "100%",
                background: k.Completion >= 100 ? "#16a34a" : "#2563eb"
              }} />
            </div>
            <div>Completion: {k.Completion || 0}%</div>
          </div>
        ))}
      </div>

      {/* EMPLOYEE HISTORY */}
      {!isAdmin && data.submissions?.length > 0 && (
        <>
          <h3 style={{ marginTop: 40 }}>My Submissions</h3>
          {data.submissions.map((s, i) => (
            <div key={i} style={{ borderBottom: "1px solid #ddd", padding: 12 }}>
              <strong>KPI {s.KPI_ID}</strong> | {s.Task_Status} | {s.Progress_Percent}%
              <div>Manager: {s.Manager_Decision || "Pending"}</div>
              {s.Manager_Feedback && <div>Feedback: {s.Manager_Feedback}</div>}
            </div>
          ))}
        </>
      )}

      {/* ADMIN APPROVALS */}
      {isAdmin && data.pendingApprovals?.length > 0 && (
        <>
          <h3 style={{ marginTop: 40 }}>Pending Approvals</h3>
          {data.pendingApprovals.map((s, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
              <strong>{s.Name}</strong> | KPI {s.KPI_ID}
              <div>Today: {s.Focus_Today}</div>
              {s.Manager_Decision ? (
                <div>✅ Reviewed</div>
              ) : (
                <>
                  <textarea
                    placeholder="Manager feedback"
                    value={feedbackDraft[i] || ""}
                    onChange={e => setFeedbackDraft({ ...feedbackDraft, [i]: e.target.value })}
                    style={{ width: "100%", marginTop: 8 }}
                  />
                  <button onClick={() => submitFeedback(s, i)} disabled={savingIndex === i}>
                    Approve
                  </button>
                </>
              )}
            </div>
          ))}
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

        <input type="number" placeholder="Progress %" value={taskStatus === "Done" ? 100 : progressPercent}
          onChange={e => setProgressPercent(e.target.value)} />

        <textarea placeholder="Today" value={focusToday} onChange={e => setFocusToday(e.target.value)} />
        <textarea placeholder="Blockers" value={blockers} onChange={e => setBlockers(e.target.value)} />
        <textarea placeholder="Tomorrow" value={focusTomorrow} onChange={e => setFocusTomorrow(e.target.value)} />

        <button onClick={submitUpdate}>Submit</button>
      </div>
    </div>
  );
}
