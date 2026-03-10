import React, { useState } from "react";
import { castVote } from "../api";

export default function StarRating({ submissionId, initialStars, onVoted }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(initialStars || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleClick(stars) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await castVote(submissionId, stars);
      setSelected(stars);
      setSuccess(true);
      if (onVoted) onVoted(stars);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const display = hovered || selected;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleClick(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              fontSize: 28,
              color: n <= display ? "#ffd700" : "#444",
              cursor: loading ? "default" : "pointer",
              padding: "0 2px",
              lineHeight: 1,
              transition: "color 0.1s",
            }}
          >
            ★
          </button>
        ))}
        {selected > 0 && (
          <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>
            {selected === initialStars ? `Your vote: ${selected}★` : `Voted: ${selected}★`}
          </span>
        )}
      </div>
      {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
      {success && <p style={{ color: "#4caf50", fontSize: 13, marginTop: 6 }}>Vote recorded!</p>}
      {initialStars && (
        <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          Click a star to change your vote.
        </p>
      )}
    </div>
  );
}
