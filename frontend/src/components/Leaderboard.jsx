import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { STATS_CONTRACT_ADDRESS, STATS_CONTRACT_ABI } from "../contracts/OrangeBlackJack";

const formatLargeNumber = (num) => {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + " billion";
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + " million";
  } else {
    return Number(num).toFixed(2);
  }
};

const Leaderboard = () => {
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stats = new ethers.Contract(STATS_CONTRACT_ADDRESS, STATS_CONTRACT_ABI, signer);

      try {
        const topPlayers = await stats.getTopPlayers();
        const formatted = topPlayers
          .filter(entry => entry.player !== ethers.ZeroAddress)
          .map(entry => ({
            address: entry.player,
            netProfit: Number(ethers.formatUnits(entry.netProfit, 18)),
            name: entry.name
          }));

        setLeaderboardEntries(formatted);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fefefe", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 0" }}>
      <div
        style={{
          maxWidth: "900px",
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          width: "100%"
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "24px", color: "#f97316", textAlign: "center", fontFamily: "Georgia, serif" }}>
          🏆 Leaderboard
        </h1>
        {leaderboardEntries.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Georgia, serif" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "center" }}>Rank</th>
                <th style={{ padding: "12px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "center" }}>Player</th>
                <th style={{ padding: "12px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "center" }}>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardEntries.map((entry, index) => (
                <tr key={index}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", textAlign: "center"}}>
                    {entry.name || `${entry.address.substring(0, 6)}...${entry.address.substring(38)}`}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", textAlign: "center", color: entry.netProfit >= 0 ? "green" : "red" }}>
                    {formatLargeNumber(entry.netProfit)} LUSD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", fontFamily: "Georgia, serif" }}>No leaderboard data available yet.</p>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;