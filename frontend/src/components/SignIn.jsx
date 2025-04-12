import React, { useState } from "react";
import { ethers } from "ethers";

function SignIn({ setAddress }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (name.trim() === "") {
      setError("Please enter your name before connecting.");
      return;
    }

    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        localStorage.setItem("playerName", name); // Save player name
        setAddress(accounts[0]);
      } catch (err) {
        setError("Connection denied.");
      }
    } else {
      setError("MetaMask not found.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
      <img src="/logo.png" alt="Logo" style={{ height: "175px", marginBottom: "0px" }} />
      <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#f97316" }}>
        Welcome to Orange & BlackJack
      </h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: "10px", width: "240px", fontSize: "14px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"}}
      />
      <button
        onClick={connectWallet}
        style={{ padding: "10px 20px", fontSize: "14px", backgroundColor: "#f97316", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#ea580c")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#f97316")}
      >
        Sign in with MetaMask
      </button>
      {error && <p style={{ color: "red", marginTop: "12px" }}>{error}</p>}
    </div>
  );
}

export default SignIn;
