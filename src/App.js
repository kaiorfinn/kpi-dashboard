import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwXBIUpUvi9Enx8JbDt5yNp4yIP9Tb9B9K6wISrCQ91fyT6KkKjkgO9tH5jFZA82LIw/exec";

export default function App() {
  const [authKey, setAuthKey] = useState(
    localStorage.getItem("authKey") || ""
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = key => {
    setLoading(true);
    setError("");
    setData(null);

    fetch(`${API_URL}?authKey=${encodeURIComponent(key)}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        localStorage.setItem("authKey", key);
        setAuthKey(key);
        setData(json);
      })
      .catch(err => {
        setError(err.message);
        localStorage.removeItem("authKey");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authKey) {
      fetchData(authKey);
    }
  }, []); // run once on load

  if (!authKey || error) {
    return (
      <div style={{ padding: 40, maxWidth: 400 }}>
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
          <p style={{ color: "red", marginTop: 10 }}>{error}</p>
        )}
      </div>
    );
  }

  if (loading || !data) {
    return <pre>Loading...</pre>;
  }

  return (
    <div style={{ padding: 20 }}>
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
      <pre>{JSON.stringify(data.kpis, null, 2)}</pre>

      <h3>Latest Submission</h3>
      <pre>{JSON.stringify(data.latestSubmission, null, 2)}</pre>

      <h3>Latest Feedback</h3>
      <pre>{JSON.stringify(data.latestFeedback, null, 2)}</pre>
    </div>
  );
}