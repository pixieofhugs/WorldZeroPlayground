import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getTasks, signupTask, dropTask, getMySignups } from "../api";

export default function Tasks() {
  const { account, character } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [signups, setSignups] = useState({}); // task_id → status
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getTasks("active"),
      account ? getMySignups() : Promise.resolve([]),
    ]).then(([taskList, mySignups]) => {
      setTasks(taskList);
      const map = {};
      mySignups.forEach((s) => { map[s.task_id] = s.status; });
      setSignups(map);
    }).catch(() => setError("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, [account]);

  async function handleSignup(taskId) {
    setActionLoading((p) => ({ ...p, [taskId]: true }));
    try {
      await signupTask(taskId);
      setSignups((p) => ({ ...p, [taskId]: "in_progress" }));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading((p) => ({ ...p, [taskId]: false }));
    }
  }

  async function handleDrop(taskId) {
    setActionLoading((p) => ({ ...p, [taskId]: true }));
    try {
      await dropTask(taskId);
      setSignups((p) => { const n = { ...p }; delete n[taskId]; return n; });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading((p) => ({ ...p, [taskId]: false }));
    }
  }

  const displayed = filter === "mine"
    ? tasks.filter((t) => signups[t.id])
    : tasks;

  if (loading) return <div className="page muted">Loading tasks...</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#7ecfff" }}>Tasks</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={filter === "all" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setFilter("all")}
          >All</button>
          <button
            className={filter === "mine" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setFilter("mine")}
            disabled={!account}
          >My Tasks</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {displayed.length === 0 && (
        <p className="muted">
          {filter === "mine" ? "You haven't signed up for any tasks yet." : "No tasks available."}
        </p>
      )}

      {displayed.map((task) => {
        const signupStatus = signups[task.id];
        const isSignedUp = !!signupStatus;
        const isSubmitted = signupStatus === "submitted";

        return (
          <div key={task.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Link to={`/tasks/${task.id}`} style={{ fontSize: 18, fontWeight: "bold" }}>
                    {task.title}
                  </Link>
                  {task.level_required > 0 && (
                    <span className="badge">Lv {task.level_required}+</span>
                  )}
                </div>
                <p style={{ color: "#aaa", fontSize: 14, marginBottom: 10 }}>
                  {task.description.slice(0, 120)}{task.description.length > 120 ? "…" : ""}
                </p>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#666" }}>
                  <span>⬡ {task.point_value} pts</span>
                  <span>◎ {task.submission_count} completions</span>
                </div>
              </div>
              {account && character && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
                  {isSubmitted ? (
                    <span style={{ color: "#4caf50", fontSize: 12, textAlign: "center" }}>Submitted ✓</span>
                  ) : isSignedUp ? (
                    <>
                      <Link to={`/tasks/${task.id}/submit`} className="btn-primary btn-sm" style={{ display: "block", textAlign: "center" }}>
                        Submit Proof
                      </Link>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleDrop(task.id)}
                        disabled={actionLoading[task.id]}
                      >
                        Drop
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleSignup(task.id)}
                      disabled={actionLoading[task.id]}
                    >
                      {actionLoading[task.id] ? "..." : "Sign Up"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
