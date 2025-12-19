import { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   PATHS
============================= */
const BASE_PATH = "/kpi-dashboard";
const ICON_LOGIN = `${BASE_PATH}/login.png`;
const ICON_ADMIN = `${BASE_PATH}/admin.png`;
const ICON_EMPLOYEE = `${BASE_PATH}/employee.png`;

/* =============================
   STYLES
============================= */
const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)"
};

const button = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #111",
  background: "#f8fafc",
  cursor: "pointer",
  fontWeight: 600
};

const sectionTitle = {
  marginTop: 32,
  marginBottom: 12
};

/* =============================
   HELPERS
============================= */
const formatDate = d =>
  d ? new Date(d).toISOString().split("T")[0] : "-";

const groupByType = kpis => ({
  Daily: kpis.filter(k => k.KPIType === "Daily"),
  Weekly: kpis.filter(k => k.KPIType === "Weekly"),
  Monthly: kpis.filter(k => k.KPIType === "Monthly")
});

/* =============================
   APP
============================= */
export default function App() {
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("tasks");

  const [activeTask, setActiveTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    status: "In Progress",
    progress: 0,
    today: "",
    blockers: "",
    next: ""
  });

  /* =============================
     FETCH
  ============================= */
  const fetchData = async key => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?authKey=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (json.error) throw new Error();
      setData(json);
      localStorage.setItem("authKey", key);
      setAuthKey(key);
    } catch {
      setAuthKey("");
      localStorage.removeItem("authKey");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
  }, [authKey]);

  /* =============================
     LOGIN
  ============================= */
  if (!authKey) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          fetchData(loginKey);
        }}
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f1f5f9"
        }}
      >
        <div style={{ ...card, width: 360, textAlign: "center" }}>
          <img src={ICON_LOGIN} alt="" style={{ width: 72 }} />
          <h2>KPI Dashboard Login</h2>
          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 12 }}
          />
          <button style={{ ...button, width: "100%", marginTop: 16 }}>
            Login
          </button>
        </div>
      </form>
    );
  }

  if (!data || loading) return <div style={{ padding: 24 }}>Loading…</div>;

  const isAdmin = data.userInfo.role === "Admin";
  const myName = data.userInfo.name;
  const icon = isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;

  const grouped = groupByType(data.kpis);

  const today = new Date().toISOString().split("T")[0];
  const pendingCount = data.kpis.filter(
    k => Number(k.Completion) < 100
  ).length;

  /* =============================
     SUBMIT UPDATE (FIXED)
  ============================= */
  const submitUpdate = async () => {
    if (!activeTask || submitting) return;

    setSubmitting(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          authKey,
          action: "submit_update",
          payload: {
            kpi_id: activeTask.KPI_ID,
            kpi_frequency: activeTask.KPIType,
            task_status: form.status,
            progress_percent:
              form.status === "Done" ? 100 : Number(form.progress),
            focus_today: form.today,
            blockers: form.blockers,
            focus_tomorrow: form.next
          }
        })
      });

      setActiveTask(null);
      fetchData(authKey);
    } finally {
      setSubmitting(false);
    }
  };

  /* =============================
     UI
  ============================= */
  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={icon} alt="" style={{ width: 48 }} />
        <h2>KPI Dashboard</h2>

        <button
          style={{ ...button, marginLeft: "auto" }}
          onClick={() => {
            localStorage.removeItem("authKey");
            setAuthKey("");
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        User: <strong>{data.userInfo.name}</strong> ({data.userInfo.role}) |
        Today: {today} | Pending Tasks: {pendingCount}
      </div>

      {/* TABS */}
      <div style={{ marginTop: 16 }}>
        <button
          style={{ ...button, marginRight: 8 }}
          onClick={() => setTab("tasks")}
        >
          Tasks
        </button>
        <button style={button} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {/* TASKS */}
      {tab === "tasks" &&
        ["Daily", "Weekly", "Monthly"].map(type => (
          <div key={type}>
            <h3 style={sectionTitle}>{type}</h3>

            {grouped[type].map(k => {
              const canUpdate = k.Assigned_User === myName;

              return (
                <div key={k.KPI_ID} style={card}>
                  <strong>{k.KPI_Name}</strong>
                  <div>Due: {formatDate(k.CompletionDate)}</div>

                  {/* PROGRESS BAR */}
                  <div style={{ marginTop: 6 }}>
                    <div
                      style={{
                        height: 8,
                        background: "#e5e7eb",
                        borderRadius: 6,
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${k.Completion}%`,
                          background: "#22c55e"
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Progress: {k.Completion}%
                    </div>
                  </div>

                  {canUpdate && (
                    <button
                      style={{ ...button, marginTop: 8 }}
                      onClick={() => {
                        setActiveTask(k);
                        setForm({
                          status: "In Progress",
                          progress: k.Completion || 0,
                          today: "",
                          blockers: "",
                          next: ""
                        });
                      }}
                    >
                      Update
                    </button>
                  )}

                  {k.Manager_Decision && (
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <strong>Manager:</strong> {k.Manager_Decision}
                      <div>{k.Manager_Feedback}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {/* HISTORY */}
      {tab === "history" &&
        ["Daily", "Weekly", "Monthly"].map(type => (
          <div key={type}>
            <h3 style={sectionTitle}>{type} History</h3>
            <table width="100%" border="1" cellPadding="6">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>KPI</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Manager</th>
                </tr>
              </thead>
              <tbody>
                {data.submissionHistory
                  .filter(s => s.KPI_Frequency === type)
                  .map((s, i) => (
                    <tr key={i}>
                      <td>{formatDate(s.Timestamp)}</td>
                      <td>{s.KPI_ID}</td>
                      <td>{s.Task_Status}</td>
                      <td>{s.Progress_Percent}%</td>
                      <td>{s.Manager_Decision || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* UPDATE MODAL */}
      {activeTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div style={{ ...card, width: 360 }}>
            <h3>Update Task</h3>

            <select
              value={form.status}
              onChange={e =>
                setForm({ ...form, status: e.target.value })
              }
            >
              <option>In Progress</option>
              <option>Done</option>
            </select>

            {form.status !== "Done" && (
              <>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={form.progress}
                  onChange={e =>
                    setForm({ ...form, progress: Number(e.target.value) })
                  }
                />
                <div>{form.progress}%</div>
              </>
            )}

            <textarea
              placeholder="Today"
              value={form.today}
              onChange={e =>
                setForm({ ...form, today: e.target.value })
              }
            />
            <textarea
              placeholder="Blockers"
              value={form.blockers}
              onChange={e =>
                setForm({ ...form, blockers: e.target.value })
              }
            />
            <textarea
              placeholder="Next"
              value={form.next}
              onChange={e =>
                setForm({ ...form, next: e.target.value })
              }
            />

            <div style={{ marginTop: 12 }}>
              <button
                style={button}
                onClick={submitUpdate}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
              <button
                style={{ ...button, marginLeft: 8 }}
                onClick={() => setActiveTask(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
