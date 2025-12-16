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
   * GLOBAL
   * =========================== */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
   * SUBMISSION FORM
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
  const [savingRow, setSavingRow] = useState(null);

  /* =============================
   * FETCH DASHBOARD
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
      setError("Invalid auth key or server error");
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
   * SUBMIT UPDATE (EMPLOYEE)
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
      setTimeout(() => fetchData(authKey), 600);
    } finally {
      setLoading(false);
    }
  };

  /* =============================
   * ADMIN APPROVAL
   * =========================== */
  const submitApproval = async (row, decision) => {
    const feedback = feedbackDraft[row.ROW_ID] || "";
    setSavingRow(row.ROW_ID);

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authKey,
          action: "submit_feedback",
          payload: {
            row_id: row.ROW_ID,
            decision,
            feedback
          }
        })
      });
      setTimeout(() => fetchData(authKey), 600);
    } finally {
      setSavingRow(null);
    }
  };

  /* =============================
   * LOGIN SCREEN
   * =========================== */
  if (!authKey) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 420, padding: 32, border: "1px solid #ddd", borderRadius: 12 }}>
          <h2 style={{ textAlign: "center" }}>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Enter Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          />
          <button onClick={handleLogin} style={{ width: "100%", padding: 12 }}>
            {loggingIn ? "Logging in…" : "Log in"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div>Loading…</div>;

  /* =============================
   * DASHBOARD
   * =========================== */
  return (
    <div style={{ padding: 24 }}>
      <h2>KPI Dashboard</h2>
      <p>User: <b>{data.userInfo.name}</b> ({data.userInfo.role})</p>

      <button onClick={() => {
        localStorage.removeItem("authKey");
        window.location.reload();
      }}>Log out</button>

      {/* KPI CARDS */}
      <h3>KPIs</h3>
      {data.kpis.map(k => (
        <div key={k.KPI_ID}>
          <b>{k.KPI_Name}</b> – {k.Completion || 0}%
        </div>
      ))}

      {/* SUBMIT UPDATE */}
      <h3>Submit Update</h3>
      <select onChange={e => setSelectedKPI(e.target.value)}>
        <option value="">Select KPI</option>
        {data.kpis.map(k => <option key={k.KPI_ID} value={k.KPI_ID}>{k.KPI_Name}</option>)}
      </select>
      <button onClick={submitUpdate}>Submit</button>

      {/* ADMIN APPROVAL */}
      {data.userInfo.role === "Admin" && (
        <>
          <h3>Admin Approvals</h3>
          {data.submissionHistory
            .filter(r => !r.Manager_Decision)
            .map(r => (
              <div key={r.ROW_ID} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
                <div><b>{r.Name}</b> – KPI {r.KPI_ID}</div>
                <div>Today: {r.Focus_Today}</div>
                <textarea
                  placeholder="Manager feedback"
                  onChange={e =>
                    setFeedbackDraft({ ...feedbackDraft, [r.ROW_ID]: e.target.value })
                  }
                />
                <br />
                <button disabled={savingRow === r.ROW_ID} onClick={() => submitApproval(r, "Approved")}>Approve</button>
                <button disabled={savingRow === r.ROW_ID} onClick={() => submitApproval(r, "Rejected")}>Reject</button>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
