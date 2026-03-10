import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getSubmission, getMyVotes, updateSubmission } from "../api";
import StarRating from "../components/StarRating";

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, character } = useAuth();
  const [sub, setSub] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwn = character && sub && character.id === sub.character_id;
  const canVote = account && character && !isOwn;

  useEffect(() => {
    Promise.all([
      getSubmission(id),
      account ? getMyVotes() : Promise.resolve([]),
    ]).then(([subData, myVotes]) => {
      setSub(subData);
      const v = myVotes.find((mv) => mv.submission_id === subData.id);
      setMyVote(v ? v.stars : null);
    }).catch(() => setError("Submission not found"))
      .finally(() => setLoading(false));
  }, [id, account]);

  function handleVoted(stars) {
    setMyVote(stars);
    // Refresh submission data to update vote count / avg
    getSubmission(id).then(setSub).catch(() => {});
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSubmission(id, { title: editTitle, body_text: editBody });
      setSub(updated);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page muted">Loading...</div>;
  if (error || !sub) return <div className="page error">{error || "Not found"}</div>;

  const avg = sub.avg_stars;
  const filled = avg != null ? Math.round(avg) : 0;

  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}>
        <Link to={`/tasks/${sub.task_id}`} className="muted">← Back to task</Link>
      </div>

      <div className="card">
        {editing ? (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Body</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
                style={{ resize: "vertical" }}
                required
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h1 style={{ fontSize: 22, color: "#7ecfff", marginBottom: 12, flex: 1 }}>{sub.title}</h1>
              {isOwn && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => { setEditing(true); setEditTitle(sub.title); setEditBody(sub.body_text); }}
                >
                  Edit
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <span>
                by <Link to={`/profile`} style={isOwn ? {} : { pointerEvents: "none", color: "#ccc" }}>
                  {sub.character.display_name}
                </Link>{" "}
                <span className="badge">Lv {sub.character.level}</span>
              </span>
              <span className="muted">{new Date(sub.created_at).toLocaleDateString()}</span>
              <span style={{ color: "#ffd700" }}>
                {"★".repeat(filled)}{"☆".repeat(5 - filled)}
                {avg != null
                  ? <span className="muted"> ({avg.toFixed(1)} · {sub.vote_count} votes)</span>
                  : <span className="muted"> (no votes yet)</span>
                }
              </span>
            </div>

            <p style={{ lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#ccc" }}>{sub.body_text}</p>
          </>
        )}
      </div>

      {!editing && (
        <div className="card">
          <h3 style={{ marginBottom: 12, color: "#aaa", fontSize: 15 }}>Rate this submission</h3>
          {!account ? (
            <p className="muted">Sign in to vote.</p>
          ) : isOwn ? (
            <p className="muted">You cannot vote on your own submission.</p>
          ) : (
            <StarRating
              submissionId={sub.id}
              initialStars={myVote}
              onVoted={handleVoted}
            />
          )}
        </div>
      )}
    </div>
  );
}
