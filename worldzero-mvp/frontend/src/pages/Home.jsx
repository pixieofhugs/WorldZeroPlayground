import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { createCharacter } from "../api";

export default function Home() {
  const { account, character, loading, login, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  // Logged in with character → go to tasks
  if (account && character) {
    navigate("/tasks", { replace: true });
    return null;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createCharacter({ username, display_name: displayName });
      await refreshAuth();
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div style={{ textAlign: "center", padding: "60px 0 40px" }}>
        <h1 style={{ fontSize: 48, letterSpacing: 4, color: "#7ecfff", marginBottom: 12 }}>
          WORLD ZERO
        </h1>
        <p style={{ color: "#888", fontSize: 16, maxWidth: 480, margin: "0 auto 32px" }}>
          A community game where players create characters, complete real-world tasks,
          post proof of their actions, and earn points through community voting.
        </p>

        {!account ? (
          <button className="btn-primary" style={{ fontSize: 16, padding: "12px 32px" }} onClick={login}>
            Sign In with Google
          </button>
        ) : (
          <div className="card" style={{ maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
            <h2 style={{ marginBottom: 16, color: "#7ecfff" }}>Create Your Character</h2>
            <p style={{ color: "#888", marginBottom: 20, fontSize: 13 }}>
              Choose a username — it's permanent. Your display name can be changed later.
            </p>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Username (permanent)</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="agent_x"
                  required
                  minLength={3}
                  maxLength={24}
                />
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Agent X"
                  required
                  maxLength={48}
                />
              </div>
              {error && <p className="error">{error}</p>}
              <button className="btn-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Creating..." : "Enter the Game"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
        {[
          { icon: "◎", title: "Complete Tasks", desc: "Sign up for real-world creative missions and complete them in the world around you." },
          { icon: "◈", title: "Post Praxis", desc: "Document your action with a title and writeup. Show your work to the community." },
          { icon: "★", title: "Earn Points", desc: "Community members vote 1–5 stars on submissions. Points determine your level." },
        ].map((item) => (
          <div key={item.title} className="card" style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
            <h3 style={{ color: "#7ecfff", marginBottom: 8 }}>{item.title}</h3>
            <p className="muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
