import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwXBIUpUvi9Enx8JbDt5yNp4yIP9Tb9B9K6wISrCQ91fyT6KkKjkgO9tH5jFZA82LIw/exec";

export default function App() {
  /* =============================
   * GLOBAL STATE
   * =========================== */
  const [authKey, setAuthKey] = useState(
    localStorage.getItem("authKey") || ""
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =============================
   * DAILY UPDATE FORM STATE
   * =========================== */
  const [focusToday, setFocusToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [focusTomorrow, setFocusTomorrow] = useState("");

  /* =============================
   * FETCH DASHBOARD DATA (GET)
   * =========================== */
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

  /* =============================
   * SUBMIT DAILY UPDATE (POST)
   * =========================== */
  const submitUpdate = async () => {
    if (!focusToday.trim()) return;

    setLoading(true);
    setError("");

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", // REQUIRED for Apps Script
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

      // Reset form
      setFocusToday("");
      setBlockers("");
      setFocusTomorrow("");

      // Refresh dashboard
      fetchData(authKey);
    } catch {
      setError("Submission failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  /* =============================
   * INITIAL LOAD
   * =========================== */
  useEffect(() => {
    if (authKey) {
      fetchData(authKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =============================
   * KPI CARD RENDERER
   * =========================== */
  const renderKpis = () => {
    if (!data?.kpis?.length) {
      return <p>No KPIs assigned.</p>;
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16
        }}
      >
        {data.kpis.map(kpi => (
          <div
            key={kpi.KPI_ID}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 16,
              background: "#ffffff"
            }}
          >
            <strong>{kpi.KPI_Name}</strong>

            {kpi.Description && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
                {kpi.Description}
              </div>
            )}

            <div style={{ fontSize: 12, marginTop: 8 }}>
              Type: <strong>{kpi.KPI_Type}</strong>
            </div>

            <div
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 4,
                marginTop: 8,
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${kpi.Completion || 0}%`,
                  height: "100%",
                  background:
                    kpi.Completion >= 100 ? "#16a34a" : "#2563eb"
                }}
              />
            </div>

            <div style={{ fontSize: 12, marginTop: 4 }}>
              Completion: <strong>{kpi.Completion || 0}%</strong>
            </div>

            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              Last updated: {kpi.Last_Updated || "—"}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* =============================
   * LOGIN SCREEN
   * =========================== */
  if (!authKey) {
    return (
      <div
        style={{
          padding: 40,
          maxWidth: 420,
          textAlign: "center"
        }}
      >
        <h2>KPI Dashboard Login</h2>

        <input
          type="password"
          placeholder="Enter Auth Key"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            fontSize: 16,
            opacity: loading ? 0.6 : 1
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !loading) {
              fetchData(e.target.value);
            }
          }}
        />

        {loading && (
          <p style={{ marginTop: 16, color: "#555" }}>
            Verifying access…
          </p>
        )}

        {error && !loading && (
          <p style={{ color: "red", marginTop: 12 }}>{error}</p>
        )}
      </div>
    );
  }

  /* =============================
   * LOADING STATE
   * =========================== */
  if (loading || !data) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  /* =============================
   * DASHBOARD
   * =========================== */
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
        onClick={submitUpdate}
        disabled={loading || !focusToday.trim()}
      >
        Submit Update
      </button>

      <h3 style={{ marginTop: 30 }}>Submission History</h3>

      {data.submissionHistory?.length ? (
        data.submissionHistory.map((s, i) => (
          <div
            key={i}
            style={{
              borderBottom: "1px solid #eee",
              padding: "10px 0"
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>
              {s.Timestamp}
            </div>
            <div>
              <strong>Today:</strong> {s.Focus_Today}
            </div>
            {s.Blockers && (
              <div>
                <strong>Blockers:</strong> {s.Blockers}
              </div>
            )}
            {s.Focus_Tomorrow && (
              <div>
                <strong>Tomorrow:</strong> {s.Focus_Tomorrow}
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No submissions yet.</p>
      )}
    </div>
  );
}