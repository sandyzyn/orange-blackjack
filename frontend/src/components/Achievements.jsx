import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import trophyNFTAbi from "../contracts/BlackjackTrophyNFT.json";

function Achievements({ address }) {
  const [trophies, setTrophies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace with your deployed contract address
  const NFT_CONTRACT_ADDRESS = "0xYourDeployedTrophyNFTContractAddress";

  useEffect(() => {
    const fetchTrophies = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const nftContract = new ethers.Contract(
          NFT_CONTRACT_ADDRESS,
          trophyNFTAbi,
          provider
        );

        const trophyDetails = await nftContract.getPlayerTrophyDetails(address);
        
        // Format the trophy details
        const formattedTrophies = trophyDetails.map(trophy => ({
          tokenId: trophy.tokenId.toString(),
          trophyType: trophy.trophyType,
          name: trophy.name,
          description: trophy.description,
          imageURI: trophy.imageURI,
          timestamp: trophy.timestamp.toNumber()
        }));
        
        setTrophies(formattedTrophies);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching trophies:", err);
        setError("Failed to load achievements. Please try again later.");
        setLoading(false);
      }
    };

    fetchTrophies();
  }, [address]);

  // Trophy card style
  const trophyCardStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    margin: "10px",
    width: "250px",
    height: "350px",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  };

  return (
    <div style={{ 
      padding: "30px", 
      maxWidth: "1200px", 
      margin: "0 auto",
      backgroundColor: "#f9fafb",
      minHeight: "calc(100vh - 85px)" 
    }}>
      <h1 style={{ 
        fontSize: "28px", 
        fontWeight: "700", 
        marginBottom: "30px", 
        textAlign: "center",
        fontFamily: "Georgia, serif",
        color: "#111827" 
      }}>
        Your Blackjack Achievements
      </h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading your trophies...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
          <p>{error}</p>
        </div>
      ) : trophies.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "60px 20px", 
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "15px",
            color: "#4b5563" 
          }}>
            No trophies yet!
          </h3>
          <p style={{ color: "#6b7280", maxWidth: "500px", margin: "0 auto" }}>
            Keep playing to earn special achievement trophies. Win games, get blackjacks, and climb the leaderboard to unlock unique NFTs!
          </p>
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>Available Trophies:</h4>
            <ul style={{ listStyleType: "none", padding: 0 }}>
              <li style={{ margin: "8px 0", color: "#6b7280" }}>🃏 Blackjack Master - Get 25 natural blackjacks</li>
              <li style={{ margin: "8px 0", color: "#6b7280" }}>💰 High Roller - Win big with a payout of 10,000+</li>
              <li style={{ margin: "8px 0", color: "#6b7280" }}>🔥 Streak King - Achieve a winning streak of 10+</li>
              <li style={{ margin: "8px 0", color: "#6b7280" }}>👑 Profit Leader - Reach #1 on the leaderboard</li>
              <li style={{ margin: "8px 0", color: "#6b7280" }}>🏆 Blackjack Veteran - Play 100+ games</li>
            </ul>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          justifyContent: "center", 
          gap: "20px" 
        }}>
          {trophies.map((trophy) => (
            <div 
              key={trophy.tokenId}
              style={trophyCardStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }}
            >
              <div style={{ 
                width: "180px", 
                height: "180px", 
                marginBottom: "15px",
                borderRadius: "5px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                {/* Use the actual URI from the contract */}
                <img 
                  src={trophy.imageURI} 
                  alt={trophy.name} 
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    // Fallback if image URI is invalid
                    e.target.src = "/images/default-trophy.png";
                  }}
                />
              </div>
              <h3 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                marginBottom: "8px",
                textAlign: "center",
                color: "#f97316"  // Orange color to match theme
              }}>
                {trophy.name}
              </h3>
              <p style={{ 
                fontSize: "14px", 
                color: "#6b7280", 
                textAlign: "center",
                marginBottom: "10px"
              }}>
                {trophy.description}
              </p>
              <p style={{ 
                fontSize: "12px", 
                color: "#9ca3af",
                marginTop: "auto"
              }}>
                Earned: {new Date(trophy.timestamp * 1000).toLocaleDateString()}
              </p>
              <p style={{ 
                fontSize: "11px", 
                color: "#9ca3af",
                marginTop: "5px"
              }}>
                Token ID: #{trophy.tokenId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Achievements;