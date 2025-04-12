import React from "react";

function InfoPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px", backgroundColor: "#fefefe" }}>
      <div style={{ maxWidth: "700px", backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", marginBottom: "20px", color: "#f97316", textAlign: "center" }}>How to Play</h1>
        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#374151" }}>
          <strong>Gameplay:</strong> <br />
          In Orange & BlackJack, you go up against a virtual dealer that follows a traditional blackjack strategy. To begin, connect your MetaMask wallet and place a bet of your choice (e.g., 0.05 Sepolia).<br /><br />
          Once you place your bet, the smart contract will deal two cards to you and two to the dealer. You’ll see both of your cards and only one of the dealer’s cards. Cards range in value from 1 to 11, and face cards (J, Q, K) count as 10.<br /><br />
          You can choose to “hit” to draw another card or “stand” to keep your current hand. Try to get as close to 21 as possible without going over. If you go over, you bust and lose the round. If you stand, the dealer will reveal their hidden card and draw until they reach at least 17.<br /><br />
          You win if your final hand is closer to 21 than the dealer’s. If there’s a tie, your original bet is returned.<br /><br />
          <strong>Payouts:</strong><br />
          • Win: 2x your bet<br />
          • Blackjack (an Ace + 10-value card): 1.5x your bet<br />
          • Tie: Bet is returned<br />
          • Loss: No payout
        </p>
      </div>
    </div>
  );
}

export default InfoPage;