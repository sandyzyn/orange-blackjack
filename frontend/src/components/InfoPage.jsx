import React from "react";

function InfoPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px", backgroundColor: "#fefefe" }}>
      <div style={{ maxWidth: "700px", backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", marginBottom: "20px", color: "#f97316", textAlign: "center" }}>How to Play</h1>
        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#374151" }}>
          <strong>Gameplay:</strong> <br />
          Orange & BlackJack is a solo game where the player goes up against a virtual dealer that follows a traditional dealer algorithm. To start a round, the player will connect their Metamask wallet and place a bet of their choice (e.g., 0.05 Sepolia).<br /><br />
          The smart contract then deals two cards each to the player and the dealer, with only one of the dealer’s cards visible. This follows a normal card distribution. The cards themselves range in value from 1 to 11, and face cards count as 10 (J, Q, and K).<br /><br />
          The player can choose to “hit” (add another card to their hand) or “stand” (end their turn). The goal is to get as close to 21 as possible without going over. If the player busts (goes over), the game ends. Otherwise, the dealer reveals their hidden card and draws until reaching at least 17. The player wins if they are closer to 21 than the dealer. In the event of a tie, the original bet is returned.<br /><br />
          <strong>Payouts follow standard rules:</strong><br />
          • Win: 2x the bet<br />
          • Blackjack (an Ace + 10-value card): 1.5x the bet<br />
          • Tie: 1x the bet<br />
          • Loss: 0 payout
        </p>
      </div>
    </div>
  );
}

export default InfoPage;
