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
     FETCH (READ ONLY)
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
     LOGIN (ENTER KEY ENABLED)
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
            onKeyDown={e => {
              if (e.key === "Enter") fetchData(loginKey);
            }}
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

  // 🚀 FAST SUBMIT (NO BLOCKING)
  const submitUpdate = () => {
    if (!selectedKPI) return alert("Select KPI");

    const finalProgress =
      taskStatus === "Done" ? 100 : Number(progressPercent) || 0;

    const kpi = data.kpis.find(k => String(k.KPI_ID) === String(selectedKPI));
    if (!kpi) return;

    // Optimistic UI
    setData(prev => ({
      ...prev,
      submissionHistory: [
        {
          Timestamp: new Date().toISOString(),
          Name: prev.userInfo.name,
          KPI_ID: selectedKPI,
          Progress_Percent: finalProgress,
          Manager_Decision: "",
          Manager_Adjusted_Progress: "",
          ROW_ID: `tmp-${Date.now()}`
        },
        ...(prev.submissionHistory || [])
      ]
    }));

    // Fire-and-forget (NO await, NO crash)
    fetch(API_URL, {
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
    }).catch(() => {}); // 🔒 swallow

    setSelectedKPI("");
    setProgressPercent("");
    setFocusToday("");
    setBlockers("");
    setFocusTomorrow("");
    setTaskStatus("In Progress");
  };

  const submitFeedback = (s, decision, adjusted) => {
    const draft = feedbackDraft[s.ROW_ID] || {};

    // Optimistic UI
    setData(prev => ({
      ...prev,
      submissionHistory: prev.submissionHistory.map(row =>
        row.ROW_ID === s.ROW_ID
          ? {
              ...row,
              Manager_Decision: decision,
              Manager_Adjusted_Progress:
                decision === "Rejected" ? 0 : Number(adjusted) || 0,
              Manager_Feedback: draft.feedback || "",
              Reviewed_By: prev.userInfo.name
            }
          : row
      )
    }));

    // Fire-and-forget (NO await, NO crash)
    fetch(API_URL, {
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
          adjusted_progress:
            decision === "Rejected" ? 0 : Number(adjusted) || 0,
          feedback: draft.feedback || ""
        }
      })
    }).catch(() => {}); // 🔒 swallow
  };

  /* =============================
     UI (UNCHANGED)
  ============================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>
      <p>
        User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})
      </p>
      <button onClick={() => { localStorage.removeItem("authKey"); window.location.reload(); }}>
        Log out
      </button>

      {/* KPI OVERVIEW */}
      <div style={section}>
        <h3>KPIs</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {data.kpis.map(k => (
            <div key={k.KPI_ID} style={card}>
              <strong>{k.KPI_Name}</strong>
              <div>Completion: {k.Completion || 0}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN APPROVALS */}
      {isAdmin && (
        <div style={section}>
          <h3>Pending Approvals</h3>
          {pendingApprovals.map(s => (
            <div key={s.ROW_ID} style={{ ...card, marginBottom: 16 }}>
              <strong>{s.Name} | KPI {s.KPI_ID}</strong>
              <button onClick={() => submitFeedback(s, "Approved", s.Progress_Percent)}>
                Approve
              </button>
              <button onClick={() => submitFeedback(s, "Rejected", 0)}>
                Reject
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
