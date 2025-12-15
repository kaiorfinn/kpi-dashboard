import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwXBIUpUvi9Enx8JbDt5yNp4yIP9Tb9B9K6wISrCQ91fyT6KkKjkgO9tH5jFZA82LIw/exec";

export default function App() {
  /* -----------------------------
   * GLOBAL STATE
   * --------------------------- */
  const [authKey, setAuthKey] = useState(
    localStorage.getItem("authKey") || ""
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* -----------------------------
   * DAILY UPDATE FORM STATE
   * --------------------------- */
  const [focusToday, setFocusToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [focusTomorrow, setFocusTomorrow] = useState("");

  /* -----------------------------
   * FETCH DASHBOARD DATA (GET)
   * --------------------------- */
  const fetchData = async key => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}?authKey=${encodeURIComponent(key)}`
      );
      const json = await res.json();

      if (json.error) throw new Error(json.error);

      localStorage.setItem("authKey", key);
      setAuthKey(key);
      setData(json);
    } catch (err) {
      setError("Submission failed. Please retry.");
    }
    // DO NOT clear authKey here
  } finally {
    setLoading(false);
  }
};

/* -----------------------------
 * SUBMIT DAILY UPDATE (POST)
 * --------------------------- */
const submitUpdate = async () => {
  if (!focusToday.trim()) return;

  setLoading(true);
  setError("");

  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors", // 🔑 REQUIRED for Apps Script
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authKey,
        action: "submit_update",
        payload: {
          focus_today: focusToday,
          blockers,
          focus_tomorrow: focusTomorrow
        }
      })
    });

    // Treat POST as success (Apps Script limitation)
    setFocusToday("");
    setBlockers("");
    setFocusTomorrow("");

    // Refresh dashboard via GET
    fetchData(authKey);
  } catch (err) {
    setError("Submission failed");
  } finally {
    setLoading(false);
  }
};

/* -----------------------------
 * INITIAL LOAD
 * --------------------------- */
useEffect(() => {
  if (authKey) {
    fetchData(authKey);
  }
}, [authKey]);

/* -----------------------------
 * KPI CARD RENDERER
 * --------------------------- */
const renderKpis = () => {
  if (!data.kpis || data.kpis.length === 0) {
    return <p>No KPIs assigned.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16
      }}
    >
      {data.kpis.map(kpi => (
        <div
          key={kpi.KPI_ID}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: "#fafafa"
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>{kpi.KPI_Name}</h4>
          <p style={{ margin: 0 }}>
            Target: <strong>{kpi.Target_Value}</strong>
          </p>
          <p style={{ fontSize: 12, color: "#666" }}>
            Metric: {kpi.Target_Metric}
          </p>
        </div>
      ))}
    </div>
  );
};

/* -----------------------------
 * LOGIN SCREEN
 * --------------------------- */
if (!authKey) {
  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h2>KPI Dashboard Login</h2>

      <input
        type="password"
        placeholder="Enter Auth Key"
        style={{ width: "100%", padding: 8 }}
        onKeyDown={e => {
          if (e.key === "Enter") fetchData(e.target.value);
        }}
      />

      {error && (
        <p style={{ color: "red", marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}

/* -----------------------------
 * LOADING STATE
 * --------------------------- */
if (loading || !data) {
  return <div style={{ padding: 40 }}>Loading…</div>;
}

/* -----------------------------
 * DASHBOARD
 * --------------------------- */
return (
  <div style={{ padding: 24, maxWidth: 960 }}>
    <h2>KPI Dashboard</h2>

    <p>
      User: <strong>{data.userInfo.name}</strong> (
      {data.userInfo.role})
    </p>

    <button
      onClick={() => {
        localStorage.removeItem("authKey");
        window.location.reload();
      }}
      style={{ marginBottom: 20 }}
    >
      Log out
    </button>

    <h3>KPIs</h3>
    {renderKpis()}

    <h3 style={{ marginTop: 30 }}>Submit Daily Update</h3>

    <div style={{ maxWidth: 500 }}>
      <textarea
        placeholder="What did you work on today?"
        value={focusToday}
        onChange={e => setFocusToday(e.target.value)}
        rows={3}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <textarea
        placeholder="Any blockers?"
        value={blockers}
        onChange={e => setBlockers(e.target.value)}
        rows={2}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <textarea
        placeholder="Focus for tomorrow"
        value={focusTomorrow}
        onChange={e => setFocusTomorrow(e.target.value)}
        rows={2}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <button
        disabled={loading || !focusToday.trim()}
        onClick={submitUpdate}
      >
        Submit Update
      </button>
    </div>

    <h3 style={{ marginTop: 30 }}>Latest Submission</h3>
    {data.latestSubmission ? (
      <ul>
        <li>
          <strong>Today:</strong>{" "}
          {data.latestSubmission.Focus_Today}
        </li>
        <li>
          <strong>Blockers:</strong>{" "}
          {data.latestSubmission.Blockers || "None"}
        </li>
        <li>
          <strong>Tomorrow:</strong>{" "}
          {data.latestSubmission.Focus_Tomorrow}
        </li>
      </ul>
    ) : (
      <p>No submission yet.</p>
    )}

    <h3>Latest Feedback</h3>
    {data.latestFeedback ? (
      <ul>
        {Object.entries(data.latestFeedback).map(([k, v]) => (
          <li key={k}>
            <strong>{k}:</strong> {String(v)}
          </li>
        ))}
      </ul>
    ) : (
      <p>No feedback yet.</p>
    )}
  </div>
);
}