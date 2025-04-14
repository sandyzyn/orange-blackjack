import React from "react";
import { Link } from "react-router-dom";

function Navbar({ setAddress }) {
  const signOut = () => {
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("playerName");
    setAddress(null); // Force reconnection on next visit
  };

  const buttonStyle = {
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "Georgia, serif",
    color: "#000000",
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 32px",
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Left: Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{ height: "60px", width: "auto", objectFit: "contain" }}
        />
      </Link>

      {/* Right: Links */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "24px" }}>
          <Link
            to="/about"
            style={{
              fontSize: "14px",
              fontWeight: "500",
              fontFamily:
                "Georgia, Serif",
              color: "#000000",
              textDecoration: "none",
              marginRight: "20px",
            }}
            onMouseOver={(e) => (e.target.style.color = "#f97316")}
            onMouseOut={(e) => (e.target.style.color = "#374151")}
          >
            How to Play
          </Link>
          <Link
            to="/leaderboard"
            style={{
              fontSize: "14px",
              fontWeight: "500",
              fontFamily:
                "Georgia, Serif",
              color: "#000000",
              textDecoration: "none",
            }}
            onMouseOver={(e) => (e.target.style.color = "#f97316")}
            onMouseOut={(e) => (e.target.style.color = "#374151")}
          >
            Leaderboard
          </Link>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link to="/game">
            <button
              style={{
                ...buttonStyle,
                backgroundColor: "#10b981",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#059669")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#10b981")}
            >
              Play Game
            </button>
          </Link>

          <button
            onClick={signOut}
            style={{
              ...buttonStyle,
              backgroundColor: "#f97316",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#ea580c")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#f97316")}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
