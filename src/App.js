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
      setError("Failed to load dashboard data");
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
        mode: "no-cors",
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

      setFocusToday("");
      setBlockers("");
      setFocusTomorrow("");

      fetchData(authKey);
    } catch {
      setError("Submission failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
   * INITIAL LOAD
   * --------------------------- */
  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* -----------------------------
   * KPI CARD RENDERER
   * --------------------------- */
  const renderKpis = () => {
    if (!data?.kpis?.length) {
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
            <h4>{kpi.KPI_Name}</h4>
            <p>
              Target: <strong>{kpi.Target_Value}</strong>
            </p>
            <small>{kpi.Target_Metric}</small>
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

        {error && <p style={{ color: "red" }}>{error}</p>}
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
      >
        Log out
      </button>

      <h3>KPIs</h3>
      {renderKpis()}

      <h3>Submit Daily Update</h3>

      <textarea
        placeholder="Today"
        value={focusToday}
        onChange={e => setFocusToday(e.target.value)}
      />

      <textarea
        placeholder="Blockers"
        value={blockers}
        onChange={e => setBlockers(e.target.value)}
      />

      <textarea
        placeholder="Tomorrow"
        value={focusTomorrow}
        onChange={e => setFocusTomorrow(e.target.value)}
      />

      <button onClick={submitUpdate} disabled={!focusToday.trim()}>
        Submit
      </button>
    </div>
  );
}