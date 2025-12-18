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
  boxShadow: "0 1px 2px rgba(0,0,0,.05)",
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "8px 0"
};

const progressWrap = {
  height: 8,
  background: "#e5e7eb",
  borderRadius: 6,
  overflow: "hidden",
  marginTop: 6
};

const progressBar = (percent, expired) => ({
  width: `${percent}%`,
  height: "100%",
  background: expired ? "#dc2626" : "#16a34a"
});

/* =============================
   HELPERS
============================= */
const formatDateOnly = d => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date)) return "-";
  return date.toISOString().split("T")[0];
};

const daysDiff = d => {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
};

const isExpired = k => {
  if (!k.CompletionDate) return false;
  if (String(k.KPI_Status || "").toLowerCase() === "done") return false;
  return daysDiff(k.CompletionDate) < 0;
};

// stable color per name
const nameColor = name => {
  const colors = ["#2563eb", "#7c3aed", "#0d9488", "#ea580c"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
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
     FETCH
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
  const submissions = useMemo(
    () => data?.submissionHistory || [],
    [data]
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const pendingTaskCount = submissions.filter(
    s => !s.Manager_Decision
  ).length;

  /* =============================
     LOGIN UI
  ============================= */
  if (!authKey) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!loginKey || loading) return;
          fetchData(loginKey);
        }}
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb"
        }}
      >
        <div
          style={{
            width: 420,
            padding: 36,
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)"
          }}
        >
          <h2 style={{ marginBottom: 24 }}>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            disabled={loading}
            onChange={e => setLoginKey(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 14,
              borderRadius: 6,
              border: "1px solid #d1d5db"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 16,
              width: "100%",
              padding: 12,
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: loading ? "#e5e7eb" : "#f3f4f6",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          {error && (
            <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>
          )}
        </div>
      </form>
    );
  }

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  /* =============================
     KPI GROUPING
  ============================= */
  const allKPIs = [...data.kpis].sort((a, b) =>
    String(a.Assigned_User).localeCompare(String(b.Assigned_User))
  );

  const dailyKPIs = allKPIs.filter(k => k.KPIType === "Daily");
  const weeklyKPIs = allKPIs.filter(k => k.KPIType === "Weekly");
  const monthlyKPIs = allKPIs.filter(k => k.KPIType === "Monthly");

  const isAdmin = data.userInfo.role === "Admin";
  const myName = data.userInfo.name;

  const splitByOwner = list => ({
    mine: list.filter(k => k.Assigned_User === myName),
    others: list.filter(k => k.Assigned_User !== myName)
  });

  /* =============================
     KPI SECTION RENDER
  ============================= */
  const renderSection = (title, list) => {
    const { mine, others } = splitByOwner(list);

    const renderCards = items =>
      items.map(k => {
        const expired = isExpired(k);
        const statusText = expired ? "EXPIRED" : "ACTIVE";
        const statusColor = expired ? "#dc2626" : "#16a34a";
        const completion = Number(k.Completion) || 0;
        const diff = daysDiff(k.CompletionDate);

        return (
          <div key={k.KPI_ID} style={card}>
            <div style={{ color: statusColor, fontWeight: 600 }}>
              Status: {statusText}
            </div>

            <div>
  <strong>Due:</strong> {formatDateOnly(k.CompletionDate)}
</div>

<div>
  <strong>Due in:</strong> {diff !== null ? `${diff} days` : "-"}
</div>

            <div style={{ fontSize: 12, color: nameColor(k.Assigned_User) }}>
              Owner: {k.Assigned_User}
            </div>

            <div style={divider} />

            <div>
              <strong>{k.KPI_Name}</strong>
            </div>

            <div style={{ fontSize: 13 }}>{k.Description}</div>

            <div style={progressWrap}>
              <div style={progressBar(completion, expired)} />
            </div>

            <div style={{ fontSize: 12 }}>Progress: {completion}%</div>
          </div>
        );
      });

    return (
      <div style={section}>
        <h3>{title}</h3>

        {isAdmin && mine.length > 0 && (
          <>
            <h4>Admin — My Tasks</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
              {renderCards(mine)}
            </div>
          </>
        )}

        <h4>{isAdmin ? "Employees — Team Tasks" : "Tasks"}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {renderCards(isAdmin ? others : list)}
        </div>
      </div>
    );
  };

  /* =============================
     UI
  ============================= */
  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2>KPI Dashboard</h2>

      <div style={{ display: "flex", gap: 60, marginBottom: 16 }}>
        <div>
          User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role})
        </div>
        <div>Today: {todayStr}</div>
        <div>Pending Task: {pendingTaskCount}</div>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("authKey");
          window.location.reload();
        }}
      >
        Log out
      </button>

      {renderSection("Daily", dailyKPIs)}
      {renderSection("Weekly", weeklyKPIs)}
      {renderSection("Monthly", monthlyKPIs)}

      {/* SUBMISSION HISTORY (UNCHANGED) */}
      <div style={section}>
        <h3>Submission History</h3>
        <table width="100%" cellPadding="10">
          <thead>
            <tr>
              {[
                "Date",
                "Name",
                "KPI",
                "Submitted",
                "Adjusted",
                "Decision",
                "Feedback",
                "Reviewed By"
              ].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s.ROW_ID}>
                <td>{formatDateOnly(s.Timestamp)}</td>
                <td>{s.Name}</td>
                <td>{s.KPI_ID}</td>
                <td>{s.Progress_Percent}%</td>
                <td>{s.Manager_Adjusted_Progress ?? "-"}</td>
                <td>{s.Manager_Decision || "Pending"}</td>
                <td>{s.Manager_Feedback || "-"}</td>
                <td>{s.Reviewed_By || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
