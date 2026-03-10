import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { getLeaderboard } from "../api";

export default function Leaderboard() {
  const { character } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page muted">Loading...</div>;

  return (
    <div className="page">
      <h1 style={{ color: "#7ecfff", marginBottom: 24 }}>Leaderboard</h1>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f0f0f", color: "#666", fontSize: 12, textTransform: "uppercase" }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Rank</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Character</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Level</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = character && character.id === entry.id;
              return (
                <tr
                  key={entry.id}
                  style={{
                    borderTop: "1px solid #1e1e1e",
                    background: isMe ? "#0e1e2e" : "transparent",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: entry.rank <= 3 ? "#ffd700" : "#666", fontWeight: "bold" }}>
                    {entry.rank <= 3 ? ["◆", "◇", "◈"][entry.rank - 1] : ""} #{entry.rank}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontWeight: "bold" }}>{entry.display_name}</span>
                    <span className="muted" style={{ marginLeft: 8 }}>@{entry.username}</span>
                    {isMe && <span style={{ marginLeft: 8, color: "#7ecfff", fontSize: 11 }}>(you)</span>}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span className="badge">Lv {entry.level}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#7ecfff", fontWeight: "bold" }}>
                    {entry.score.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="muted" style={{ padding: 20, textAlign: "center" }}>
            No characters yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
