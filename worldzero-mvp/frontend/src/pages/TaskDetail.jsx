import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getTask, signupTask, dropTask, getMySignups } from "../api";

function Stars({ avg, count }) {
  if (avg == null) return <span className="muted">No votes yet</span>;
  const filled = Math.round(avg);
  return (
    <span>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}{" "}
      <span className="muted">({avg.toFixed(1)} · {count} votes)</span>
    </span>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const { account, character } = useAuth();
  const [task, setTask] = useState(null);
  const [signupStatus, setSignupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getTask(id),
      account ? getMySignups() : Promise.resolve([]),
    ]).then(([taskData, signups]) => {
      setTask(taskData);
      const mine = signups.find((s) => s.task_id === taskData.id);
      setSignupStatus(mine ? mine.status : null);
    }).catch(() => setError("Failed to load task"))
      .finally(() => setLoading(false));
  }, [id, account]);

  async function handleSignup() {
    setActionLoading(true);
    try {
      await signupTask(id);
      setSignupStatus("in_progress");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDrop() {
    setActionLoading(true);
    try {
      await dropTask(id);
      setSignupStatus(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="page muted">Loading...</div>;
  if (error || !task) return <div className="page error">{error || "Task not found"}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}>
        <Link to="/tasks" className="muted">← Tasks</Link>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <h1 style={{ fontSize: 24, color: "#7ecfff" }}>{task.title}</h1>
              {task.level_required > 0 && <span className="badge">Lv {task.level_required}+</span>}
            </div>
            <p style={{ color: "#bbb", lineHeight: 1.6, marginBottom: 16 }}>{task.description}</p>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#666" }}>
              <span>⬡ {task.point_value} points</span>
              <span>◎ {task.submission_count} completions</span>
            </div>
          </div>

          {account && character && (
            <div style={{ marginLeft: 20, minWidth: 130 }}>
              {signupStatus === "submitted" ? (
                <span style={{ color: "#4caf50", fontSize: 13 }}>Submitted ✓</span>
              ) : signupStatus === "in_progress" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link to={`/tasks/${id}/submit`} className="btn-primary btn-sm" style={{ display: "block", textAlign: "center" }}>
                    Submit Proof
                  </Link>
                  <button className="btn-secondary btn-sm" onClick={handleDrop} disabled={actionLoading}>
                    Drop Task
                  </button>
                </div>
              ) : (
                <button className="btn-primary" onClick={handleSignup} disabled={actionLoading}>
                  {actionLoading ? "..." : "Sign Up"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h2 style={{ marginBottom: 16, color: "#aaa", fontSize: 16 }}>
        Submissions ({task.submissions?.length || 0})
      </h2>

      {!task.submissions?.length && (
        <p className="muted">No submissions yet. Be the first!</p>
      )}

      {task.submissions?.map((sub) => (
        <div key={sub.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Link to={`/submissions/${sub.id}`} style={{ fontSize: 16, fontWeight: "bold" }}>
                {sub.title}
              </Link>
              <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
                by <Link to={`/characters/${sub.character.id}`}>{sub.character.display_name}</Link>
                {" "}<span className="badge">Lv {sub.character.level}</span>
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: 13 }}>
              <div style={{ color: "#ffd700" }}>
                <Stars avg={sub.avg_stars} count={sub.vote_count} />
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {new Date(sub.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
