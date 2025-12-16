import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

export default function App() {
  /* ================= AUTH ================= */
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  /* ================= GLOBAL ================= */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= FORM ================= */
  const [selectedKPI, setSelectedKPI] = useState("");
  const [taskStatus, setTaskStatus] = useState("In Progress");
  const [progressPercent, setProgressPercent] = useState("");
  const [focusToday, setFocusToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [focusTomorrow, setFocusTomorrow] = useState("");

  /* ================= FETCH ================= */
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

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    if (!loginKey.trim()) return;
    setLoggingIn(true);
    await fetchData(loginKey);
    setLoggingIn(false);
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* ================= SUBMIT UPDATE ================= */
  const submitUpdate = async () => {
    if (!selectedKPI) {
      alert("Select a KPI first");
      return;
    }

    const finalProgress =
      taskStatus === "Done" ? 100 : Number(progressPercent) || 0;

    if (finalProgress < 0 || finalProgress > 100) {
      alert("Progress must be 0–100%");
      return;
    }

    const kpi = data.kpis.find(
      k => String(k.KPI_ID) === String(selectedKPI)
    );
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
      setTaskStatus("In Progress");
      setProgressPercent("");
      setFocusToday("");
      setBlockers("");
      setFocusTomorrow("");

      setTimeout(() => fetchData(authKey), 600);
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOGIN SCREEN ================= */
  if (!authKey) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6"
      }}>
        <div style={{
          width: 420,
          padding: 32,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
        }}>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>
            KPI Dashboard Login
          </h2>

          <input
            type="password"
            placeholder="Enter Auth Key"
            value={loginKey}
            disabled={loggingIn}
            onChange={e => setLoginKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              border: "1px solid #d1d5db"
            }}
          />

          <button
            onClick={handleLogin}
            disabled={loggingIn}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: loggingIn ? "#9ca3af" : "#2563eb",
              color: "#fff",
              fontWeight: 600
            }}
          >
            {loggingIn ? "Logging in…" : "Log in"}
          </button>

          {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  /* ================= DASHBOARD ================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>
      <p>
        User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})
      </p>

      <button onClick={() => {
        localStorage.removeItem("authKey");
        window.location.reload();
      }}>
        Log out
      </button>

      <h3 style={{ marginTop: 30 }}>KPIs</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
        gap: 16
      }}>
        {data.kpis.map(k => (
          <div key={k.KPI_ID} style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16
          }}>
            <strong>{k.KPI_Name}</strong>
            <div>{k.Description}</div>
            <div>Assigned: {k.Assigned_User}</div>
            <div style={{ height: 8, background: "#e5e7eb", marginTop: 8 }}>
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

      <h3 style={{ marginTop: 30 }}>Submit Update</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={selectedKPI} onChange={e => setSelectedKPI(e.target.value)}>
          <option value="">Select KPI</option>
          {data.kpis.map(k => (
            <option key={k.KPI_ID} value={k.KPI_ID}>{k.KPI_Name}</option>
          ))}
        </select>

        <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
          <option>In Progress</option>
          <option>Done</option>
        </select>

        <input
          type="number"
          placeholder="Progress %"
          value={taskStatus === "Done" ? 100 : progressPercent}
          disabled={taskStatus === "Done"}
          onChange={e => setProgressPercent(e.target.value)}
        />

        <textarea placeholder="Today" value={focusToday} onChange={e => setFocusToday(e.target.value)} />
        <textarea placeholder="Blockers" value={blockers} onChange={e => setBlockers(e.target.value)} />
        <textarea placeholder="Tomorrow" value={focusTomorrow} onChange={e => setFocusTomorrow(e.target.value)} />

        <button onClick={submitUpdate}>Submit</button>
      </div>
    </div>
  );
}
