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
   SHARED CONTROLS
============================= */
const control = {
  width: "100%",
  height: 48,
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 14,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box"
};

/* =============================
   HELPERS
============================= */
const formatDate = d => (d ? String(d).split(" ")[0] : "-");

/* =============================
   APP
============================= */
export default function App() {
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("tasks");
  const [showModal, setShowModal] = useState(false);
  const [activeKPI, setActiveKPI] = useState(null);

  const [taskStatus, setTaskStatus] = useState("In Progress");
  const [progress, setProgress] = useState(0);
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");
  const [next, setNext] = useState("");

  /* =============================
     FETCH
  ============================= */
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
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc"
        }}
      >
        <div style={{
          width: 420,
          padding: 40,
          borderRadius: 16,
          background: "#fff",
          textAlign: "center",
          boxShadow: "0 30px 60px rgba(0,0,0,.12)"
        }}>
          <img src={ICON_LOGIN} style={{ width: 80, marginBottom: 24 }} />
          <h2>KPI Dashboard Login</h2>

          <input
            style={{ ...control, marginTop: 16 }}
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
          />

          <button style={{ ...control, marginTop: 16, fontWeight: 600 }}>
            Login
          </button>

          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        </div>
      </form>
    );
  }

  if (!data) return <div style={{ padding: 40 }}>Loading…</div>;

  const isAdmin = data.userInfo.role === "Admin";
  const headerIcon = isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;

  /* =============================
     SUBMIT UPDATE
  ============================= */
  const submitUpdate = async () => {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        authKey,
        action: "submit_update",
        payload: {
          kpi_id: activeKPI.KPI_ID,
          kpi_frequency: activeKPI.KPIType,
          task_status: taskStatus,
          progress_percent: taskStatus === "Done" ? 100 : progress,
          feedback: today,
          blockers,
          next
        }
      })
    });

    setShowModal(false);
    fetchData(authKey);
  };

  /* =============================
     UI
  ============================= */
  return (
    <div style={{ padding: 32, background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img src={headerIcon} style={{ width: 56 }} />
        <h2>KPI Dashboard</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
        <button onClick={() => setActiveTab("tasks")}>
          Tasks
        </button>
        <button onClick={() => setActiveTab("history")}>
          History
        </button>
      </div>

      {/* TASKS */}
      {activeTab === "tasks" && (
        <div style={{ marginTop: 32 }}>
          {data.kpis.map(k => (
            <div key={k.KPI_ID} style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              marginBottom: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,.06)"
            }}>
              <strong>{k.KPI_Name}</strong>
              <div>Due: {formatDate(k.CompletionDate)}</div>
              <div>Progress: {k.Completion}%</div>

              <button
                style={{ marginTop: 12 }}
                onClick={() => {
                  setActiveKPI(k);
                  setProgress(k.Completion || 0);
                  setTaskStatus("In Progress");
                  setShowModal(true);
                }}
              >
                Update
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div style={{ marginTop: 32 }}>
          {data.submissionHistory.map(s => (
            <div key={s.ROW_ID} style={{
              background: "#fff",
              padding: 16,
              borderRadius: 10,
              marginBottom: 12
            }}>
              <strong>{s.KPI_ID}</strong>
              <div>Status: {s.Task_Status}</div>
              <div>Progress: {s.Progress_Percent}%</div>
              <div>Manager Decision: {s.Manager_Decision || "-"}</div>
              <div>Manager Feedback: {s.Manager_Feedback || "-"}</div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#fff",
            padding: 32,
            borderRadius: 16,
            width: 420
          }}>
            <h3>Update Task</h3>

            <select
              style={{ ...control, marginTop: 12 }}
              value={taskStatus}
              onChange={e => {
                setTaskStatus(e.target.value);
                if (e.target.value === "Done") setProgress(100);
              }}
            >
              <option>In Progress</option>
              <option>Done</option>
            </select>

            {taskStatus !== "Done" && (
              <input
                style={{ ...control, marginTop: 12 }}
                type="number"
                value={progress}
                onChange={e => setProgress(e.target.value)}
              />
            )}

            <textarea
              style={{ ...control, marginTop: 12, height: 60 }}
              placeholder="Today"
              onChange={e => setToday(e.target.value)}
            />
            <textarea
              style={{ ...control, marginTop: 12, height: 60 }}
              placeholder="Blockers"
              onChange={e => setBlockers(e.target.value)}
            />
            <textarea
              style={{ ...control, marginTop: 12, height: 60 }}
              placeholder="Next"
              onChange={e => setNext(e.target.value)}
            />

            <button style={{ marginTop: 16 }} onClick={submitUpdate}>
              Submit
            </button>
            <button style={{ marginLeft: 12 }} onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
