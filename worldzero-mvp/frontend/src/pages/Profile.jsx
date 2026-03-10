import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { updateCharacter, getCharacterSubmissions } from "../api";

const LEVEL_THRESHOLDS = [0, 10, 70, 170, 330, 610, 1090, 1840, 3040];

function nextLevelScore(level) {
  return LEVEL_THRESHOLDS[level + 1] ?? null;
}

export default function Profile() {
  const { account, character, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account) { navigate("/"); return; }
    if (!character) return;
    setDisplayName(character.display_name);
    setBio(character.bio || "");
    getCharacterSubmissions(character.id).then(setSubmissions).catch(() => {});
  }, [account, character, navigate]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateCharacter(character.id, { display_name: displayName, bio });
      await refreshAuth();
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!account) return null;
  if (!character) {
    return (
      <div className="page">
        <p className="muted">You don't have a character yet. <Link to="/">Create one</Link>.</p>
      </div>
    );
  }

  const next = nextLevelScore(character.level);

  return (
    <div className="page">
      <div className="card" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", background: "#222",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, flexShrink: 0, border: "2px solid #333"
        }}>
          {character.avatar_url ? <img src={character.avatar_url} alt="" style={{ width: "100%", borderRadius: "50%" }} /> : "◎"}
        </div>
        <div style={{ flex: 1 }}>
          {editing ? (
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={48} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ resize: "vertical" }} maxLength={300} />
              </div>
              {error && <p className="error">{error}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary btn-sm" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <h2 style={{ fontSize: 22 }}>{character.display_name}</h2>
                <span className="badge">Level {character.level}</span>
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
              </div>
              <p className="muted" style={{ marginBottom: 8 }}>@{character.username}</p>
              {character.bio && <p style={{ color: "#bbb", marginBottom: 8 }}>{character.bio}</p>}
              <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#888" }}>
                <span>Score: <strong style={{ color: "#7ecfff" }}>{character.score.toFixed(1)}</strong></span>
                <span>All-time: <strong style={{ color: "#aaa" }}>{character.all_time_score.toFixed(1)}</strong></span>
                {next && <span className="muted">{next - character.score} pts to Lv {character.level + 1}</span>}
              </div>
            </>
          )}
        </div>
      </div>

      <h2 style={{ marginBottom: 16, color: "#aaa", fontSize: 16 }}>
        My Submissions ({submissions.length})
      </h2>
      {submissions.length === 0 && <p className="muted">No submissions yet.</p>}
      {submissions.map((sub) => (
        <div key={sub.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link to={`/submissions/${sub.id}`} style={{ fontWeight: "bold" }}>{sub.title}</Link>
            <span className="muted" style={{ fontSize: 12 }}>{new Date(sub.created_at).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            {sub.avg_stars != null
              ? `★ ${sub.avg_stars.toFixed(1)} · ${sub.vote_count} votes · ${sub.score.toFixed(1)} pts`
              : "No votes yet"
            }
          </div>
        </div>
      ))}
    </div>
  );
}
