import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

export default function App() {
  /* =============================
   * AUTH
   * =========================== */
  const [authKey, setAuthKey] = useState(
    localStorage.getItem("authKey") || ""
  );
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
  const [savingRow, setSavingRow] = useState(null);

  /* =============================
   * FETCH
   * =========================== */
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
   * LOGIN
   * =========================== */
  if (!authKey) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 420, padding: 32, background: "#fff", borderRadius: 12 }}>
          <h2 style={{ textAlign: "center" }}>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Enter Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchData(loginKey)}
            style={{ width: "100%", padding: 12, marginBottom: 16 }}
          />
          <button
            onClick={() => fetchData(loginKey)}
            style={{ width: "100%", padding: 12 }}
          >
            {loggingIn ? "Logging in…" : "Log in"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div>Loading…</div>;

  /* =============================
   * ADMIN APPROVAL HANDLER
   * =========================== */
  const submitFeedback = async row => {
    const feedback = feedbackDraft[row.ROW_ID];
    if (!feedback) return alert("Feedback required");

    setSavingRow(row.ROW_ID);

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authKey,
        action: "submit_feedback",
        payload: {
          row_id: row.ROW_ID,
          feedback
        }
      })
    });

    setTimeout(() => fetchData(authKey), 600);
    setSavingRow(null);
  };

  /* =============================
   * UI
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,300px)", gap: 16 }}>
        {data.kpis.map(k => (
          <div key={k.KPI_ID} style={{ border: "1px solid #ddd", padding: 16 }}>
            <b>{k.KPI_Name}</b>
            <div>{k.Description}</div>
            <div>Completion: {k.Completion || 0}%</div>
          </div>
        ))}
      </div>

      {/* ADMIN APPROVAL */}
      {data.userInfo.role === "Admin" && (
        <>
          <h3 style={{ marginTop: 40 }}>Pending Approvals</h3>

          {data.submissionHistory.map(row => (
            <div key={row.ROW_ID} style={{ borderBottom: "1px solid #ddd", padding: 12 }}>
              <b>{row.Name}</b> | KPI {row.KPI_ID}
              <div>Today: {row.Focus_Today}</div>

              {row.Manager_Decision ? (
                <div>✅ Reviewed</div>
              ) : (
                <>
                  <textarea
                    placeholder="Manager feedback"
                    value={feedbackDraft[row.ROW_ID] || ""}
                    onChange={e =>
                      setFeedbackDraft({
                        ...feedbackDraft,
                        [row.ROW_ID]: e.target.value
                      })
                    }
                  />
                  <button
                    disabled={savingRow === row.ROW_ID}
                    onClick={() => submitFeedback(row)}
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
