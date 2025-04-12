import React, { useState, useEffect } from "react";

function Game({ address }) {
  const [name, setName] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("playerName");
    if (storedName) {
      setName(storedName);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", padding: "24px", textAlign: "center" }}>
      <div style={{ maxWidth: "400px", width: "100%", backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#1f2937" }}>
          Welcome {name || "Player"}
        </h2>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>Let’s play Blackjack 🃏</p>
      </div>
    </div>
  );
}

export default Game;