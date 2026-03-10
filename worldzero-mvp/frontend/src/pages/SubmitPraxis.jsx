import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getTask, createSubmission } from "../api";

export default function SubmitPraxis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, character } = useAuth();
  const [task, setTask] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!account) {
      navigate("/");
      return;
    }
    getTask(id).then(setTask).catch(() => setError("Task not found"));
  }, [id, account, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const sub = await createSubmission({ task_id: parseInt(id), title, body_text: body });
      navigate(`/submissions/${sub.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!task) return <div className="page muted">{error || "Loading..."}</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}>
        <Link to={`/tasks/${id}`} className="muted">← {task.title}</Link>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <h1 style={{ color: "#7ecfff", marginBottom: 4, fontSize: 22 }}>Submit Praxis</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Task: <strong style={{ color: "#ccc" }}>{task.title}</strong>
          {" — "}{task.point_value} pts
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you do?"
              required
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label>Your story (describe what you did, how, and what happened)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell the community about your experience..."
              required
              rows={10}
              style={{ resize: "vertical" }}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Praxis"}
            </button>
            <Link to={`/tasks/${id}`}>
              <button type="button" className="btn-secondary">Cancel</button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
