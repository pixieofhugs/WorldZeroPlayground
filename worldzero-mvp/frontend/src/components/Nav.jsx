import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Nav() {
  const { account, character, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={{
      background: "#0f0f0f",
      borderBottom: "1px solid #1e1e1e",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      height: 52,
      gap: 24,
    }}>
      <Link to="/" style={{ color: "#7ecfff", fontWeight: "bold", fontSize: 16, letterSpacing: 2 }}>
        WORLD ZERO
      </Link>

      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        <Link to="/tasks" style={{ color: "#888", fontSize: 14 }}>Tasks</Link>
        <Link to="/leaderboard" style={{ color: "#888", fontSize: 14 }}>Leaderboard</Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {account ? (
          <>
            {character ? (
              <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 6, color: "#ccc", fontSize: 13 }}>
                <span style={{ color: "#7ecfff" }}>{character.display_name}</span>
                <span className="badge">Lv {character.level}</span>
              </Link>
            ) : (
              <Link to="/" style={{ color: "#888", fontSize: 13 }}>Create Character</Link>
            )}
            <button className="btn-secondary btn-sm" onClick={logout}>Logout</button>
          </>
        ) : (
          <button className="btn-primary btn-sm" onClick={login}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
