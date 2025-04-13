import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract/OrangeBlackJack";

const LUSD_ADDRESS = "0x9142FA65aAEf921Aea2127e88758adeE0510a0F0";
const OWNER_ADDRESS = "0x29821A88A2CB149b8519d38226f9A8c58Ab6cDA3".toLowerCase();
const GAME_STATES = ["NotStarted", "PlayerTurn", "DealerTurn", "Finished"];

const CARD_STYLE = {
  width: "80px",
  height: "100px",
  backgroundColor: "white",
  border: "1px solid black",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.9rem",
  fontWeight: "bold",
  padding: "0.5rem",
  textAlign: "center"
};

const Toast = ({ message, color }) => (
  <div style={{
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    backgroundColor: color,
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)',
    zIndex: 9999
  }}>
    {message}
  </div>
);

const Game = () => {
  const [status, setStatus] = useState("🦊 Connect your wallet to begin.");
  const [betAmount, setBetAmount] = useState("");
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerCard, setDealerCard] = useState(null);
  const [dealerFullHand, setDealerFullHand] = useState([]);
  const [contract, setContract] = useState(null);
  const [LUSD, setLUSD] = useState(null);
  const [gameState, setGameState] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [lusdBalance, setLusdBalance] = useState("0");
  const [isApproved, setIsApproved] = useState(false);
  const [hasGame, setHasGame] = useState(false);
  const [username, setUsername] = useState("");
  const [toast, setToast] = useState({ message: "", color: "" });
  const [isOwner, setIsOwner] = useState(false);
  const [handTotal, setHandTotal] = useState(null);
  const [dealerTotal, setDealerTotal] = useState(null);

  // New state variables for leaderboard and admin features
  const [leaderboard, setLeaderboard] = useState({ address: "", profit: 0 });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editPlayerInput, setEditPlayerInput] = useState("");
  const [editPlayerAddress, setEditPlayerAddress] = useState("");
  const [editDealerInput, setEditDealerInput] = useState("");
  const [playerStats, setPlayerStats] = useState({
    wins: 0,
    losses: 0,
    ties: 0,
    blackjacks: 0,
    lifetimeEarnings: 0,
    totalBets: 0
  });
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const showToast = (message, color) => {
    setToast({ message, color });
    setTimeout(() => setToast({ message: "", color: "" }), 3000);
  };

  const calculateHandTotal = (hand) => {
    let total = 0;
    let aces = 0;
    for (let card of hand) {
      if (card.includes("Ace")) {
        total += 11;
        aces++;
      } else if (card.includes("10") || card.includes("Jack") || card.includes("Queen") || card.includes("King")) {
        total += 10;
      } else {
        const match = card.match(/\d+/);
        if (match) total += parseInt(match[0]);
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  };

  const getTotalColor = (total) => {
    if (total > 21) return "red";
    if (total === 21) return "green";
    return "#111827";
  };

  useEffect(() => {
    const storedName = localStorage.getItem("playerName");
    if (storedName) setUsername(storedName);

    const init = async () => {
      if (!window.ethereum) return setStatus("❌ Please install MetaMask.");

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const user = await signer.getAddress();
        setWalletAddress(user);
        setIsOwner(user.toLowerCase() === OWNER_ADDRESS);

        const blackjack = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(blackjack);

        const LUSD_ABI = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)",
          "function balanceOf(address account) view returns (uint256)",
        ];
        const lusd = new ethers.Contract(LUSD_ADDRESS, LUSD_ABI, signer);
        setLUSD(lusd);

        await checkLusdAllowanceAndBalance(lusd, user);
        await fetchGameState(blackjack);
        await checkIfPlayerHasGame(blackjack);
        await fetchLeaderboard(blackjack);
        await fetchPlayerStats(blackjack);
        setStatus("✅ Wallet connected.");
      } catch (err) {
        console.error(err);
        setStatus("❌ Wallet connection failed.");
      }
    };

    init();
  }, []);

  const checkLusdAllowanceAndBalance = async (lusd, user) => {
    const balance = await lusd.balanceOf(user);
    const allowance = await lusd.allowance(user, CONTRACT_ADDRESS);
    setLusdBalance(ethers.formatUnits(balance, 18));
    setIsApproved(allowance >= ethers.parseUnits("100", 18));
  };

  const checkIfPlayerHasGame = async (contractInstance) => {
    try {
      const hand = await contractInstance.getMyHand();
      setHasGame(hand.length > 0);
    } catch {
      setHasGame(false);
    }
  };

  const fetchGameState = async (instance = contract) => {
    if (!instance) return;
    try {
      const state = await instance.getGameState();
      setGameState(Number(state));
    } catch (err) {
      console.error("Failed to get game state", err);
    }
  };

  const fetchLeaderboard = async (instance = contract) => {
    if (!instance) return;
    try {
      const [address, profit] = await instance.getTopPlayer();
      setLeaderboard({
        address: address,
        profit: Number(ethers.formatUnits(profit, 18))
      });
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  const fetchPlayerStats = async (instance = contract) => {
    if (!instance) return;
    try {
      const stats = await instance.getMyStats();
      setPlayerStats({
        wins: Number(stats.wins),
        losses: Number(stats.losses),
        ties: Number(stats.ties),
        blackjacks: Number(stats.blackjacks),
        lifetimeEarnings: Number(ethers.formatUnits(stats.lifetimeEarnings, 18)),
        totalBets: Number(ethers.formatUnits(stats.totalBets, 18))
      });
    } catch (err) {
      console.error("Failed to fetch player stats", err);
    }
  };

  const fetchHands = async () => {
    if (!contract) return;
    try {
      const formattedHand = await contract.getFormattedMyHand();
      const dealerFull = await contract.getFormattedDealerHand();
      const state = await contract.getGameState();

      setPlayerHand(formattedHand);
      const myTotal = calculateHandTotal(formattedHand);
      setHandTotal(myTotal);

      if (Number(state) === 3) {
        setDealerFullHand(dealerFull);
        setDealerCard(null);
        setDealerTotal(calculateHandTotal(dealerFull));
      } else {
        setDealerCard(dealerFull.length > 0 ? dealerFull[0] : null);
        setDealerFullHand([]);
        setDealerTotal(null);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch hands.");
    }
  };

  const resetGame = async () => {
    if (!contract) return;
    try {
      const tx = await contract.forceEndGame(walletAddress);
      await tx.wait();
      setStatus("🔁 Game reset successfully.");
      await fetchGameState();
      await fetchHands();
      await checkIfPlayerHasGame(contract);
      showToast("Game force-ended.", "gray");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to reset game.");
    }
  };

  const approveLUSD = async () => {
    try {
      const tx = await LUSD.approve(CONTRACT_ADDRESS, ethers.parseUnits("1000", 18));
      await tx.wait();
      setStatus("✅ Approved LUSD for betting.");
      setIsApproved(true);
    } catch (err) {
      console.error(err);
      setStatus("❌ Approval failed: " + err.message);
    }
  };

  const placeBet = async () => {
    if (!contract || !isApproved) {
      setStatus("❌ Please approve LUSD before betting.");
      return;
    }

    try {
      const state = await contract.getGameState();
      if (Number(state) === 1 || Number(state) === 2) {
        setStatus("⚠️ You already have a game in progress.");
        return;
      }

      const amount = ethers.parseUnits(betAmount, 18);
      const tx = await contract.placeBet(amount);
      await tx.wait();
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(contract);
      await checkLusdAllowanceAndBalance(LUSD, walletAddress);
      setStatus("🎲 Game started!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Bet failed: Please enter a valid number");
    }
  };

  const hit = async () => {
    if (!contract || !hasGame) {
      setStatus("❌ No active game found.");
      return;
    }

    try {
      const currentState = await contract.getGameState();
      if (Number(currentState) !== 1) {
        setStatus("❌ It's not your turn to hit.");
        return;
      }

      const tx = await contract.hit();
      await tx.wait();

      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(contract);

      const newState = await contract.getGameState();
      if (Number(newState) === 3) {
        setStatus("💥 You busted! Game over.");
        showToast("💥 You busted!", "red");
        await fetchPlayerStats(contract);
        await fetchLeaderboard(contract);
        await checkLusdAllowanceAndBalance(LUSD, walletAddress);
      } else {
        setStatus("🎯 Hit successful.");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Hit failed: " + (err.reason || err.message));
    }
  };

  const stand = async () => {
    if (!contract || !hasGame) {
      setStatus("❌ No active game.");
      return;
    }

    try {
      const currentState = await contract.getGameState();
      if (Number(currentState) !== 1) {
        setStatus("❌ It's not your turn to stand.");
        return;
      }

      const tx = await contract.stand();
      const receipt = await tx.wait();

      const iface = new ethers.Interface(CONTRACT_ABI);
      const gameEndedTopic = iface.getEvent("GameEnded").topicHash;

      const log = receipt.logs.find(
        log => log.topics[0] === gameEndedTopic &&
                log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );

      if (log) {
        const decoded = iface.decodeEventLog("GameEnded", log.data, log.topics);
        const result = decoded.result;
        const payout = decoded.payout;

        if (result === "Player wins" || result === "Win") {
          const gain = ethers.formatUnits(payout, 18);
          setStatus(`🎉 You won! (+${gain} LUSD)`);
          showToast(`🎉 You won! +${gain} LUSD`, "green");
        } else if (result === "Dealer wins" || result === "Loss") {
          setStatus("😢 Dealer wins.");
          showToast("😢 Dealer wins.", "red");
        } else if (result === "Tie") {
          setStatus("🤝 It's a tie.");
          showToast("🤝 It's a tie.", "gray");
        } else {
          setStatus(`🪙 Game ended: ${result}`);
          showToast(`🪙 ${result}`, "gray");
        }
      } else {
        setStatus("🛑 Game over, but no result found.");
      }

      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(contract);
      await fetchPlayerStats(contract);
      await fetchLeaderboard(contract);
      await checkLusdAllowanceAndBalance(LUSD, walletAddress);
    } catch (err) {
      console.error("❌ Stand failed: ", err);
      setStatus("❌ Stand failed — possibly not your game or already ended.");
    }
  };

  // New admin functions
  const editPlayerHand = async () => {
    if (!contract || !isOwner) return;
    try {
      // Parse the input string to array of numbers
      const cards = editPlayerInput.split(",").map(card => parseInt(card.trim()));
      
      if (cards.some(isNaN) || cards.some(card => card < 1 || card > 13)) {
        showToast("❌ Invalid card values. Use numbers 1-13 separated by commas.", "red");
        return;
      }

      const tx = await contract.editPlayerHand(editPlayerAddress, cards);
      await tx.wait();
      showToast("✅ Player hand edited", "green");
      setEditPlayerInput("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to edit player hand", "red");
    }
  };

  const editDealerHand = async () => {
    if (!contract || !isOwner) return;
    try {
      // Parse the input string to array of numbers
      const cards = editDealerInput.split(",").map(card => parseInt(card.trim()));
      
      if (cards.some(isNaN) || cards.some(card => card < 1 || card > 13)) {
        showToast("❌ Invalid card values. Use numbers 1-13 separated by commas.", "red");
        return;
      }

      const tx = await contract.editDealerHand(editPlayerAddress, cards);
      await tx.wait();
      showToast("✅ Dealer hand edited", "green");
      setEditDealerInput("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to edit dealer hand", "red");
    }
  };

  const withdrawFunds = async () => {
    if (!contract || !isOwner) return;
    try {
      const amount = ethers.parseUnits(withdrawAmount, 18);
      const tx = await contract.withdrawAmount(amount);
      await tx.wait();
      showToast(`✅ Withdrew ${withdrawAmount} LUSD`, "green");
      setWithdrawAmount("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to withdraw funds", "red");
    }
  };

  const withdrawAllFunds = async () => {
    if (!contract || !isOwner) return;
    try {
      const tx = await contract.withdrawAll();
      await tx.wait();
      showToast("✅ All funds withdrawn", "green");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to withdraw all funds", "red");
    }
  };

  const startNewGame = () => {
    setBetAmount("");
    setPlayerHand([]);
    setDealerCard(null);
    setDealerFullHand([]);
    setHandTotal(null);
    setDealerTotal(null);
    setStatus("🎲 Ready to place a new bet.");
  };

  const saveUsername = () => {
    if (username.trim()) {
      localStorage.setItem("playerName", username);
      showToast(`Username saved as ${username}`, "green");
    }
  };

  // Calculate net profit
  const netProfit = playerStats.lifetimeEarnings - playerStats.totalBets;

  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem", fontFamily: "Georgia, serif", textAlign: "center" }}>
      {toast.message && <Toast message={toast.message} color={toast.color} />}

      <h1 style={{ color: "#f57c00", fontSize: "2.5rem", marginBottom: "1rem" }}>
        🍊 Orange BlackJack
      </h1>

      <div style={{ marginBottom: "1rem" }}>
        <input 
          type="text" 
          placeholder="Enter your username" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          style={{ padding: "0.5rem", fontSize: "1rem", width: "200px", marginRight: "1rem" }}
        />
        <button onClick={saveUsername}>Save Name</button>
      </div>

      <p><strong>Status:</strong> {status}</p>
      <p><strong>LUSD Balance:</strong> {lusdBalance}</p>
      <p><strong>Game State:</strong> {GAME_STATES[gameState]}</p>

      {/* Stats Panel */}
      <div style={{ marginBottom: "2rem", backgroundColor: "#fff3e0", padding: "1rem", borderRadius: "8px" }}>
        <h3>📊 Your Stats</h3>
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
          <div><strong>Wins:</strong> {playerStats.wins}</div>
          <div><strong>Losses:</strong> {playerStats.losses}</div>
          <div><strong>Ties:</strong> {playerStats.ties}</div>
          <div><strong>Blackjacks:</strong> {playerStats.blackjacks}</div>
          <div><strong>Lifetime Earnings:</strong> {playerStats.lifetimeEarnings.toFixed(2)} LUSD</div>
          <div><strong>Total Bets:</strong> {playerStats.totalBets.toFixed(2)} LUSD</div>
          <div style={{ color: netProfit >= 0 ? "green" : "red" }}>
            <strong>Net Profit:</strong> {netProfit.toFixed(2)} LUSD
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ marginBottom: "2rem", backgroundColor: "#ffecb3", padding: "1rem", borderRadius: "8px" }}>
        <h3>🏆 Leaderboard</h3>
        <p><strong>Top Player:</strong> {leaderboard.address.substring(0, 6)}...{leaderboard.address.substring(38)}</p>
        <p><strong>Net Profit:</strong> {leaderboard.profit.toFixed(2)} LUSD</p>
      </div>

      {isOwner && (
        <div style={{ marginBottom: "2rem", backgroundColor: "#ffe4c4", padding: "1rem", borderRadius: "8px" }}>
          <h3>🔧 Admin Controls</h3>
          <button 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            style={{ padding: "0.5rem 1rem", marginBottom: "1rem", fontWeight: "bold" }}
          >
            {showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
          </button>
          
          {showAdminPanel && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div>
                <h4>Edit Player's Hand</h4>
                <input
                  type="text"
                  placeholder="Player address"
                  value={editPlayerAddress}
                  onChange={(e) => setEditPlayerAddress(e.target.value)}
                  style={{ width: "300px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <input
                  type="text"
                  placeholder="Cards (e.g. 1,10,5)"
                  value={editPlayerInput}
                  onChange={(e) => setEditPlayerInput(e.target.value)}
                  style={{ width: "150px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <button onClick={editPlayerHand}>Edit Player Hand</button>
              </div>
              
              <div>
                <h4>Edit Dealer's Hand</h4>
                <input
                  type="text"
                  placeholder="Player address (same as above)"
                  value={editPlayerAddress}
                  onChange={(e) => setEditPlayerAddress(e.target.value)}
                  style={{ width: "300px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <input
                  type="text"
                  placeholder="Cards (e.g. 1,10,5)"
                  value={editDealerInput}
                  onChange={(e) => setEditDealerInput(e.target.value)}
                  style={{ width: "150px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <button onClick={editDealerHand}>Edit Dealer Hand</button>
              </div>
              
              <div>
                <h4>Withdraw Funds</h4>
                <input
                  type="number"
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{ width: "200px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <button onClick={withdrawFunds} style={{ marginRight: "0.5rem" }}>Withdraw Amount</button>
                <button onClick={withdrawAllFunds}>Withdraw All</button>
              </div>
              
              <div>
                <h4>Force End Game</h4>
                <input
                  type="text"
                  placeholder="Player address"
                  value={editPlayerAddress}
                  onChange={(e) => setEditPlayerAddress(e.target.value)}
                  style={{ width: "300px", padding: "0.5rem", marginRight: "0.5rem" }}
                />
                <button onClick={() => {
                  if (editPlayerAddress) {
                    contract.forceEndGame(editPlayerAddress)
                      .then(tx => tx.wait())
                      .then(() => showToast("Game force-ended for player", "green"))
                      .catch(err => {
                        console.error(err);
                        showToast("Failed to force end game", "red");
                      });
                  }
                }}>Force End</button>
              </div>
            </div>
          )}
          
          <button 
            onClick={resetGame} 
            style={{ padding: "0.5rem 1rem", fontWeight: "bold", marginTop: "1rem" }}
          >
            Reset My Game
          </button>
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        {!hasGame && (
          <p style={{ color: "darkred", fontWeight: "bold" }}>
            ⚠️ You don't have an active game yet. Place a bet to start.
          </p>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="number"
            placeholder="Enter bet in LUSD"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            style={{ padding: "0.5rem", fontSize: "1rem", width: "200px", marginRight: "1rem" }}
          />
          <button onClick={placeBet} disabled={!isApproved || gameState === 1 || gameState === 2}>Place Bet</button>
          <button onClick={approveLUSD} disabled={isApproved} style={{ marginLeft: "0.5rem" }}>
            Approve LUSD
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ flex: "1", minWidth: "300px", marginRight: "1rem" }}>
          <h2 style={{ color: getTotalColor(handTotal) }}>
            🧑 Your Hand {handTotal !== null && `(Total: ${handTotal})`}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1rem", flexWrap: "wrap" }}>
            {playerHand.length > 0
              ? playerHand.map((card, i) => (
                  <div key={i} style={CARD_STYLE}>{card}</div>
                ))
              : <p>No cards yet</p>}
          </div>
        </div>

        <div style={{ flex: "1", minWidth: "300px" }}>
          <h2 style={{ color: getTotalColor(dealerTotal) }}>
            🃏 Dealer's Hand {dealerTotal !== null && `(Total: ${dealerTotal})`}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {dealerFullHand.length > 0 ? (
              dealerFullHand.map((card, i) => (
                <div key={i} style={CARD_STYLE}>{card}</div>
              ))
            ) : dealerCard !== null ? (
              <div style={CARD_STYLE}>{dealerCard}</div>
            ) : (
              <p>No card revealed yet</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "2rem" }}>
        <button 
          onClick={hit} 
          disabled={gameState !== 1 || !hasGame}
          style={{ 
            padding: "0.75rem 2rem", 
            fontSize: "1.2rem",
            backgroundColor: gameState === 1 && hasGame ? "#4caf50" : "#cccccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: gameState === 1 && hasGame ? "pointer" : "not-allowed"
          }}
        >
          Hit
        </button>
        <button 
          onClick={stand} 
          disabled={gameState !== 1 || !hasGame}
          style={{ 
            padding: "0.75rem 2rem", 
            fontSize: "1.2rem",
            backgroundColor: gameState === 1 && hasGame ? "#f57c00" : "#cccccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: gameState === 1 && hasGame ? "pointer" : "not-allowed"
          }}
        >
          Stand
        </button>
        <button 
          onClick={startNewGame}
          disabled={gameState === 1 || gameState === 2}
          style={{ 
            padding: "0.75rem 2rem", 
            fontSize: "1.2rem",
            backgroundColor: gameState !== 1 && gameState !== 2 ? "#2196f3" : "#cccccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: gameState !== 1 && gameState !== 2 ? "pointer" : "not-allowed"
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
};

export default Game;