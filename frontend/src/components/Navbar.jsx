import React from "react";
import { Link } from "react-router-dom";

function Navbar({ setAddress }) {
  const signOut = () => {
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("playerName");
    setAddress(null); // Force reconnection on next visit
  };

  return (
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 32px", backgroundColor: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Left: Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{ height: "60px", width: "auto", objectFit: "contain" }}
        />
      </Link>

      {/* Right: Separated Link and Button */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "24px" }}>
          <Link
            to="/about"
            style={{ fontSize: "14px", fontWeight: "500", color: "#374151", textDecoration: "none" }}
            onMouseOver={(e) => (e.target.style.color = "#f97316")}
            onMouseOut={(e) => (e.target.style.color = "#374151")}
          >
            How to Play
          </Link>
        </div>
        <div>
          <button
            onClick={signOut}
            style={{ fontSize: "14px", backgroundColor: "#f97316", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}
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
