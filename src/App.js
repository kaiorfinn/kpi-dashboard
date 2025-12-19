import { useEffect, useMemo, useState } from "react";

/* =========================================================
   CONFIG
========================================================= */
const API_URL =
  "https://script.google.com/macros/s/AKfycbwutvWRTxac6YzooC2xHx0AHR8V2sDohtyQ7KRSz5IOhpCfZV-MLMKMiW3U00LS5FGT/exec";

/* =============================
   PATHS
============================= */
const BASE_PATH = "/kpi-dashboard";
const ICON_LOGIN = `${BASE_PATH}/login.png`;
const ICON_ADMIN = `${BASE_PATH}/admin.png`;
const ICON_EMPLOYEE = `${BASE_PATH}/employee.png`;

/* =========================================================
   STYLES (keep your existing look & feel)
========================================================= */
const pageWrap = {
  padding: 24,
  background: "#f8fafc",
  minHeight: "100vh"
};

const cardBase = {
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  background: "#fff",
  boxSizing: "border-box"
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

const inputBase = {
  width: "100%",
  padding: 12,
  fontSize: 14,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff"
};

const textareaBase = {
  ...inputBase,
  minHeight: 70,
  resize: "vertical"
};

const tableBase = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  background: "#fff"
};

const thTdBase = {
  border: "1px solid #e5e7eb",
  padding: 8,
  verticalAlign: "top"
};

/* =========================================================
   HELPERS
========================================================= */
const formatDate = d => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toISOString().split("T")[0];
};

const formatDateTime = d => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toISOString().replace("T", " ").slice(0, 16);
};

const daysDiff = d => {
  if (!d) return null;
  const dd = new Date(d);
  if (isNaN(dd.getTime())) return null;

  const diff = Math.floor(
    (dd.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  return diff;
};

const groupByType = kpis => ({
  Daily: kpis.filter(k => k.KPIType === "Daily"),
  Weekly: kpis.filter(k => k.KPIType === "Weekly"),
  Monthly: kpis.filter(k => k.KPIType === "Monthly")
});

// stable color per owner (same as your approach)
const ownerColor = name => {
  if (!name) return "#475569";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360},70%,40%)`;
};

// safe getter – tolerate slightly different sheet header keys
const pick = (obj, keys, fallback = "") => {
  for (const k of keys) {
    if (
      obj &&
      obj[k] !== undefined &&
      obj[k] !== null &&
      String(obj[k]) !== ""
    ) {
      return obj[k];
    }
  }
  return fallback;
};

const asNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeDecision = v => String(v || "").trim();

/* =========================================================
   SMALL UI PIECES (no hooks here)
========================================================= */
function OwnerPill({ name }) {
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 9999,
        background: ownerColor(name),
        color: "#fff",
        fontSize: 13,
        lineHeight: "18px"
      }}
    >
      {name}
    </span>
  );
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, asNum(value)));
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          height: 8,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "#22c55e"
          }}
        />
      </div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Progress: {pct}%</div>
    </div>
  );
}

function DueLine({ completionDate }) {
  const d = daysDiff(completionDate);
  const baseFont = { fontSize: 13 };

  return (
    <div style={{ ...baseFont, marginTop: 8 }}>
      Due: {formatDate(completionDate)}{" "}
      {d !== null && (
        <span style={{ color: d < 0 ? "#dc2626" : "#16a34a" }}>
          ({d < 0 ? `Overdue ${Math.abs(d)}` : `In ${d}`} days)
        </span>
      )}
    </div>
  );
}

function TabButtons({ tab, setTab }) {
  return (
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
  );
}

/* =========================================================
   APP
========================================================= */
export default function App() {
  /* =============================
     STATE (ALL HOOKS MUST BE HERE – NEVER AFTER A RETURN)
  ============================= */
  const [authKey, setAuthKey] = useState(localStorage.getItem("authKey") || "");
  const [loginKey, setLoginKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

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
      if (json.error) throw new Error(json.error);

      setData(json);
      localStorage.setItem("authKey", key);
      setAuthKey(key);
    } catch {
      localStorage.removeItem("authKey");
      setAuthKey("");
      setData(null);
    } finally {
      setLoading(false);
      setLoggingIn(false);
    }
  };

  useEffect(() => {
    if (authKey) fetchData(authKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey]);

  /* =============================
     MEMOS (MUST NOT BE CONDITIONAL)
  ============================= */
  const isAdmin = useMemo(() => {
    return Boolean(data && data.userInfo && data.userInfo.role === "Admin");
  }, [data]);

  const myName = useMemo(() => {
    return data && data.userInfo ? data.userInfo.name : "";
  }, [data]);

  const icon = useMemo(() => {
    return isAdmin ? ICON_ADMIN : ICON_EMPLOYEE;
  }, [isAdmin]);

  const today = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Full history sorted; this is the source of truth for both “History” tab and “latestSubmission”
  const historyAll = useMemo(() => {
    const arr = data && Array.isArray(data.submissionHistory) ? data.submissionHistory : [];
    return [...arr].sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  }, [data]);

  // Map KPI_ID → KPI_Name (for history display)
  const kpiNameById = useMemo(() => {
    const map = {};
    const kpis = data && Array.isArray(data.kpis) ? data.kpis : [];
    kpis.forEach(k => {
      map[k.KPI_ID] = k.KPI_Name;
    });
    return map;
  }, [data]);

  // Decorate kpis with latestSubmission (non-mutating)
  const kpisDecorated = useMemo(() => {
    const kpis = data && Array.isArray(data.kpis) ? data.kpis : [];
    return kpis.map(k => {
      const latest = historyAll
        .filter(s => pick(s, ["KPI_ID"], "") === k.KPI_ID)
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0];

      return { ...k, latestSubmission: latest };
    });
  }, [data, historyAll]);

  const grouped = useMemo(() => {
    return groupByType(kpisDecorated);
  }, [kpisDecorated]);

  const pendingCount = useMemo(() => {
    return kpisDecorated.filter(k => asNum(k.Completion) < 100).length;
  }, [kpisDecorated]);

  // History grouped by KPI_Frequency (Daily/Weekly/Monthly) — FIX for “history empty”
  const historyByType = useMemo(() => {
    const out = { Daily: [], Weekly: [], Monthly: [], Other: [] };
    historyAll.forEach(s => {
      const t = String(pick(s, ["KPI_Frequency"], "")).trim();
      if (t === "Daily") out.Daily.push(s);
      else if (t === "Weekly") out.Weekly.push(s);
      else if (t === "Monthly") out.Monthly.push(s);
      else out.Other.push(s);
    });
    return out;
  }, [historyAll]);

  /* =============================
     SUBMIT UPDATE
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
     ADMIN DECISION
  ============================= */
  const submitAdminDecision = async (kpi, decision) => {
    const sub = kpi.latestSubmission;
    if (!sub) return;

    const rowId = pick(sub, ["ROW_ID"], null);
    if (!rowId) return;

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        authKey,
        action: "submit_feedback",
        payload: {
          row_id: rowId,
          kpi_id: kpi.KPI_ID,
          decision,
          adjusted_progress: asNum(pick(sub, ["Progress_Percent"], 0)),
          feedback: "" // keep as-is (your current UI does not collect manager feedback)
        }
      })
    });

    fetchData(authKey);
  };

  /* =========================================================
     RENDER: LOGIN (no hooks after this point)
  ========================================================= */
  if (!authKey) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          setLoggingIn(true);
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
        <div style={{ ...cardBase, width: 420, textAlign: "center" }}>
          <img src={ICON_LOGIN} alt="" style={{ width: 72, marginBottom: 10 }} />
          <h2 style={{ margin: "8px 0 18px" }}>KPI Dashboard Login</h2>

          <input
            type="password"
            placeholder="Auth Key"
            value={loginKey}
            onChange={e => setLoginKey(e.target.value)}
            style={inputBase}
          />

          <button
            style={{ ...button, width: "100%", marginTop: 14, padding: 14 }}
            disabled={loggingIn}
          >
            {loggingIn ? "Logging…" : "Login"}
          </button>
        </div>
      </form>
    );
  }

  if (!data || loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  /* =========================================================
     RENDER: MAIN
  ========================================================= */
  return (
    <div style={pageWrap}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={icon} alt="" style={{ width: 34 }} />
        <h2 style={{ margin: 0 }}>KPI Dashboard</h2>

        {/* Logout next to KPI Dashboard */}
        <button
          style={{ ...button, marginLeft: 8 }}
          onClick={() => {
            localStorage.removeItem("authKey");
            setAuthKey("");
            setData(null);
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        User: <strong>{myName}</strong> ({data.userInfo.role}) | Today: {today} |
        Pending Tasks: {pendingCount}
      </div>

      {/* TABS */}
      <TabButtons tab={tab} setTab={setTab} />

      {/* =======================================================
          TASKS VIEW
      ======================================================= */}
      {tab === "tasks" &&
        ["Daily", "Weekly", "Monthly"].map(type => (
          <div key={type}>
            <h3 style={sectionTitle}>{type}</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 16
              }}
            >
              {grouped[type].map(k => {
                const canUpdate = pick(k, ["Assigned_User"], "") === myName;
                const latest = k.latestSubmission;

                const pendingReview =
                  latest && !normalizeDecision(pick(latest, ["Manager_Decision"], ""));

                // font size alignment requirement
                const commonFont = { fontSize: 13 };

                return (
                  <div key={k.KPI_ID} style={cardBase}>
                    {/* Title (same font size as owner/due) */}
                    <div style={{ ...commonFont, fontWeight: 700 }}>
                      {k.KPI_Name}
                    </div>

                    {/* Owner pill (admin only) */}
                    {isAdmin && (
                      <div style={{ marginTop: 8 }}>
                        <OwnerPill name={pick(k, ["Assigned_User"], "")} />
                      </div>
                    )}

                    {/* Due */}
                    <DueLine completionDate={pick(k, ["CompletionDate"], "")} />

                    {/* Progress bar + percentage */}
                    <ProgressBar value={pick(k, ["Completion"], 0)} />

                    {/* Pending review */}
                    {pendingReview && (
                      <div style={{ ...commonFont, color: "#f59e0b", marginTop: 8 }}>
                        Pending Review
                      </div>
                    )}

                    {/* Update button (same as your logic) */}
                    {canUpdate && (
                      <button
                        style={{ ...button, marginTop: 10 }}
                        onClick={() => {
                          setActiveTask(k);
                          setForm({
                            status: "In Progress",
                            progress: asNum(pick(k, ["Completion"], 0)),
                            today: "",
                            blockers: "",
                            next: ""
                          });
                        }}
                      >
                        Update
                      </button>
                    )}

                    {/* Admin approve/reject for pending review */}
                    {isAdmin && pendingReview && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button
                          style={button}
                          onClick={() => submitAdminDecision(k, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          style={button}
                          onClick={() => submitAdminDecision(k, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Optional: show latest update quick info for admin */}
                    {isAdmin && latest && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
                        Latest: {formatDateTime(pick(latest, ["Timestamp"], ""))} •{" "}
                        {pick(latest, ["Task_Status"], "-")} •{" "}
                        {asNum(pick(latest, ["Progress_Percent"], 0))}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* =======================================================
          HISTORY VIEW  (FIXED)
          - Uses submissionHistory directly
          - Does not rely on KPI sheet columns
          - Shows approved and non-approved rows
      ======================================================= */}
      {tab === "history" && (
        <div style={{ marginTop: 32 }}>
          <h3 style={sectionTitle}>Submission History</h3>

          {historyAll.length === 0 && (
            <div style={{ ...cardBase }}>
              No history found. (If you can see Submissions in Sheets, then your
              API is returning empty submissionHistory — likely Apps Script GET
              mapping issue.)
            </div>
          )}

          {["Daily", "Weekly", "Monthly"].map(freq => (
            <div key={freq}>
              <h4 style={{ marginTop: 18, marginBottom: 10 }}>{freq}</h4>

              {historyByType[freq].length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  No submissions in {freq}.
                </div>
              ) : (
                <table style={tableBase}>
                  <thead>
                    <tr>
                      <th style={thTdBase}>Time</th>
                      <th style={thTdBase}>Name</th>
                      <th style={thTdBase}>KPI</th>
                      <th style={thTdBase}>Status</th>
                      <th style={thTdBase}>Progress</th>
                      <th style={thTdBase}>Manager</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyByType[freq].map((s, idx) => {
                      const kpiId = pick(s, ["KPI_ID"], "-");
                      const kpiName = kpiNameById[kpiId] || kpiId;

                      const mgrDecision = pick(s, ["Manager_Decision"], "");
                      const mgrAdj = pick(s, ["Manager_Adjusted_Progress"], "");
                      const reviewedBy = pick(s, ["Reviewed_By"], "");
                      const reviewedAt = pick(s, ["Reviewed_At"], "");
                      const mgrFeedback = pick(s, ["Manager_Feedback"], "");

                      const mgrTextParts = [];
                      if (mgrDecision) mgrTextParts.push(String(mgrDecision));
                      if (mgrAdj !== "") mgrTextParts.push(`Adj: ${mgrAdj}%`);
                      if (reviewedBy) mgrTextParts.push(`By: ${reviewedBy}`);
                      if (reviewedAt) mgrTextParts.push(`At: ${formatDateTime(reviewedAt)}`);

                      const mgrText = mgrTextParts.join(" • ");

                      return (
                        <tr key={`${freq}-${idx}`}>
                          <td style={thTdBase}>
                            {formatDateTime(pick(s, ["Timestamp"], ""))}
                          </td>
                          <td style={thTdBase}>{pick(s, ["Name"], "-")}</td>
                          <td style={thTdBase}>{kpiName}</td>
                          <td style={thTdBase}>{pick(s, ["Task_Status"], "-")}</td>
                          <td style={thTdBase}>
                            {asNum(pick(s, ["Progress_Percent"], 0))}%
                          </td>
                          <td style={thTdBase}>
                            {mgrText || "-"}
                            {mgrFeedback ? (
                              <div style={{ marginTop: 6 }}>
                                <strong>Feedback:</strong> {mgrFeedback}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* If any "Other" frequency exists */}
          {historyByType.Other.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginTop: 18, marginBottom: 10 }}>Other</h4>
              {historyByType.Other.map((s, idx) => (
                <div key={`other-${idx}`} style={{ ...cardBase, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    {pick(s, ["Name"], "-")} —{" "}
                    {kpiNameById[pick(s, ["KPI_ID"], "-")] || pick(s, ["KPI_ID"], "-")}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Time: {formatDateTime(pick(s, ["Timestamp"], ""))} • Frequency:{" "}
                    {pick(s, ["KPI_Frequency"], "-")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================
          UPDATE MODAL
      ======================================================= */}
      {activeTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16
          }}
        >
          <div style={{ ...cardBase, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>Update Task</h3>

            <div style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>{pick(activeTask, ["KPI_Name"], "")}</strong>
            </div>

            <div style={{ marginBottom: 10 }}>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={inputBase}
              >
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>

            {form.status !== "Done" && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={form.progress}
                  onChange={e =>
                    setForm({ ...form, progress: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  {asNum(form.progress)}%
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {/* NOTE: Your code.gs currently writes Feedback/Blockers/Next only,
                  so we keep the UI fields aligned to those columns. */}
              <textarea
                placeholder="Update (goes to Feedback column)"
                value={form.today}
                onChange={e => setForm({ ...form, today: e.target.value })}
                style={textareaBase}
              />
              <textarea
                placeholder="Blockers"
                value={form.blockers}
                onChange={e => setForm({ ...form, blockers: e.target.value })}
                style={textareaBase}
              />
              <textarea
                placeholder="Next"
                value={form.next}
                onChange={e => setForm({ ...form, next: e.target.value })}
                style={textareaBase}
              />
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={button} onClick={submitUpdate} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </button>

              <button
                style={button}
                onClick={() => setActiveTask(null)}
                disabled={submitting}
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
