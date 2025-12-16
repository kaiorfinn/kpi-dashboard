import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

export default function App() {
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginKey.trim()) return;
    setLoggingIn(true);
    await fetchData(loginKey);
    setLoggingIn(false);
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* ================= LOGIN ================= */
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
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 16
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
              fontWeight: 600,
              cursor: loggingIn ? "not-allowed" : "pointer"
            }}
          >
            {loggingIn ? "Logging in…" : "Log in"}
          </button>

          {error && (
            <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
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
    </div>
  );
}
