import { useEffect, useMemo, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   UI HELPERS
============================= */
const section = { marginTop: 40 };
const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,.05)"
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
      decision: s.Manager_Decision || ""
    }));
  }, [data]);

  const pendingApprovals = useMemo(() => {
    if (!data || data.userInfo.role !== "Admin") return [];
    return submissions.filter(s => !s.decision);
  }, [data, submissions]);

  /* =============================
     LOGIN
  ============================= */
  if (!authKey) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 420, padding: 32, border: "1px solid #ddd" }}>
          <h2>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
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
     ACTIONS
  ============================= */
  const submitUpdate = async () => {
    if (!selectedKPI) return alert("Select KPI");

    const finalProgress =
      taskStatus === "Done" ? 100 : Number(progressPercent) || 0;

    const kpi = data.kpis.find(k => String(k.KPI_ID) === String(selectedKPI));
    if (!kpi) return;

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
  };

  const submitFeedback = async (s, decision, adjusted) => {
    const draft = feedbackDraft[s.ROW_ID] || {};
    setSavingRowId(s.ROW_ID);

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authKey,
        action: "submit_feedback",
        payload: {
          row_id: s.ROW_ID,
          kpi_id: s.KPI_ID,
          decision,
          adjusted_progress: adjusted,
          feedback: draft.feedback || ""
        }
      })
    });

    setTimeout(() => fetchData(authKey), 600);
    setSavingRowId(null);
  };

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
      <div style={section}>
        <h3>KPIs</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {data.kpis.map(k => (
            <div key={k.KPI_ID} style={card}>
              <strong>{k.KPI_Name}</strong>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Owner: <strong>{k.Assigned_User}</strong>
              </div>
              <div style={{ marginTop: 8 }}>{k.Description}</div>
              <div style={{ height: 8, background: "#e5e7eb", marginTop: 12 }}>
                <div style={{ width: `${k.Completion || 0}%`, height: "100%", background: "#16a34a" }} />
              </div>
              <div>Completion: {k.Completion || 0}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN APPROVALS */}
      {isAdmin && (
        <div style={section}>
          <h3>Pending Approvals</h3>
          {pendingApprovals.map(s => {
            const draft = feedbackDraft[s.ROW_ID] || {};
            return (
              <div key={s.ROW_ID} style={{ ...card, marginBottom: 16 }}>
                <strong>{s.Name} | KPI {s.KPI_ID}</strong>
                <div>Submitted: {s.Progress_Percent}%</div>

                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginTop: 12 }}>
                  <label>Adjusted Progress</label>
                  <input
                    type="number"
                    value={draft.adjusted ?? s.Progress_Percent}
                    onChange={e =>
                      setFeedbackDraft({ ...feedbackDraft, [s.ROW_ID]: { ...draft, adjusted: e.target.value } })
                    }
                  />

                  <label>Manager Feedback</label>
                  <textarea
                    value={draft.feedback || ""}
                    onChange={e =>
                      setFeedbackDraft({ ...feedbackDraft, [s.ROW_ID]: { ...draft, feedback: e.target.value } })
                    }
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <button onClick={() => submitFeedback(s, "Approved", Number(draft.adjusted))}>
                    Approve
                  </button>
                  <button
                    style={{ marginLeft: 8, background: "#fee2e2" }}
                    onClick={() => submitFeedback(s, "Rejected", 0)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMIT UPDATE */}
      <div style={section}>
        <h3>Submit Update</h3>
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <select value={selectedKPI} onChange={e => setSelectedKPI(e.target.value)}>
            <option value="">Select KPI</option>
            {data.kpis.map(k => <option key={k.KPI_ID} value={k.KPI_ID}>{k.KPI_Name}</option>)}
          </select>

          <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
            <option>In Progress</option>
            <option>Done</option>
          </select>

          <input placeholder="Progress %" value={progressPercent} onChange={e => setProgressPercent(e.target.value)} />

          <textarea placeholder="Today" value={focusToday} onChange={e => setFocusToday(e.target.value)} />
          <textarea placeholder="Blockers" value={blockers} onChange={e => setBlockers(e.target.value)} />
          <textarea placeholder="Tomorrow" value={focusTomorrow} onChange={e => setFocusTomorrow(e.target.value)} />

          <button onClick={submitUpdate}>Submit</button>
        </div>
      </div>

      {/* HISTORY */}
      <div style={section}>
        <h3>Submission History</h3>
        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              {["Time","Name","KPI","Submitted","Adjusted","Decision","Feedback"].map(h => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
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
    </div>
  );
}
