import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { GAME_CONTRACT_ADDRESS, STATS_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, STATS_CONTRACT_ABI } from "../contract/OrangeBlackJack";

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
  const [gameContract, setGameContract] = useState(null);
  const [statsContract, setStatsContract] = useState(null);
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

  // New state variables for enhanced features
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
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
    totalBets: 0,
    biggestWin: 0,
    currentStreak: 0,
    longestStreak: 0,
    gamesPlayed: 0,
    name: ""
  });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [gameOutcome, setGameOutcome] = useState({ status: "", result: "", payout: 0 });

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

        // Initialize both contracts
        const game = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
        setGameContract(game);
        
        const stats = new ethers.Contract(STATS_CONTRACT_ADDRESS, STATS_CONTRACT_ABI, signer);
        setStatsContract(stats);

        const LUSD_ABI = [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)",
          "function balanceOf(address account) view returns (uint256)",
        ];
        const lusd = new ethers.Contract(LUSD_ADDRESS, LUSD_ABI, signer);
        setLUSD(lusd);

        await checkLusdAllowanceAndBalance(lusd, user);
        await fetchGameState(game, user);
        await checkIfPlayerHasGame(game, user);
        await fetchLeaderboard(stats);
        await fetchPlayerStats(stats, user);
        await fetchGameOutcome(game, user);
        await fetchHands(game, user);
        
        // Set name to contract if available in localStorage
        if (storedName) {
          try {
            // Check if name in contract matches localStorage
            const contractName = await stats.getPlayerName(user);
            if (contractName !== storedName) {
              // Set name on the contract if different
              await stats.setName(storedName);
            }
          } catch (err) {
            console.error("Failed to set name:", err);
          }
        }
        
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
    const allowance = await lusd.allowance(user, GAME_CONTRACT_ADDRESS);
    setLusdBalance(ethers.formatUnits(balance, 18));
    setIsApproved(allowance >= ethers.parseUnits("100", 18));
  };

  const checkIfPlayerHasGame = async (gameInstance, playerAddress = walletAddress) => {
    if (!playerAddress) return;
    
    try {
      const gameData = await gameInstance.getGameState(playerAddress);
      setHasGame(gameData.pHand.length > 0 && (gameData.state === 1n || gameData.state === 2n));
    } catch (err) {
      console.error("Failed to check if player has game:", err);
      setHasGame(false);
    }
  };

  const fetchGameState = async (instance = gameContract, playerAddress = walletAddress) => {
    if (!instance || !playerAddress) return;
    
    try {
      const gameData = await instance.getGameState(playerAddress);
      setGameState(Number(gameData.state));
    } catch (err) {
      console.error("Failed to get game state", err);
    }
  };

  const fetchLeaderboard = async (instance = statsContract) => {
    if (!instance) return;
    try {
      const topPlayers = await instance.getTopPlayers();
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

  const fetchPlayerStats = async (instance = statsContract, playerAddress = walletAddress) => {
    if (!instance || !playerAddress) return;
    
    try {
      const stats = await instance.getStats(playerAddress);
      setPlayerStats({
        wins: Number(stats.wins),
        losses: Number(stats.losses),
        ties: Number(stats.ties),
        blackjacks: Number(stats.blackjacks),
        lifetimeEarnings: Number(ethers.formatUnits(stats.earnings, 18)),
        totalBets: Number(ethers.formatUnits(stats.bets, 18)),
        biggestWin: Number(ethers.formatUnits(stats.biggestWin, 18)),
        currentStreak: Number(stats.streak),
        longestStreak: Number(stats.longestStreak),
        gamesPlayed: Number(stats.gamesPlayed),
        name: stats.name || ""
      });
      
      // If we have a stored name but contract doesn't, update username in state
      if (stats.name && stats.name !== username) {
        setUsername(stats.name);
        localStorage.setItem("playerName", stats.name);
      }
    } catch (err) {
      console.error("Failed to fetch player stats", err);
    }
  };

  const fetchGameOutcome = async (instance = gameContract, playerAddress = walletAddress) => {
    if (!instance || !playerAddress) return;
    
    try {
      const gameData = await instance.getGameState(playerAddress);
      if (Number(gameData.state) === 3) { // Finished
        setGameOutcome({
          status: "Finished",
          result: gameData.result,
          payout: Number(ethers.formatUnits(gameData.payout, 18))
        });
      } else {
        setGameOutcome({
          status: GAME_STATES[Number(gameData.state)],
          result: "",
          payout: 0
        });
      }
    } catch (err) {
      console.error("Failed to fetch game outcome", err);
    }
  };

  const fetchHands = async (instance = gameContract, playerAddress = walletAddress) => {
    if (!instance || !playerAddress) return;
    
    try {
      const gameData = await instance.getGameState(playerAddress);
      
      // Format the raw hand data to readable format
      const formattedPlayerHand = formatHandData(gameData.pHand);
      const formattedDealerHand = formatHandData(gameData.dHand);
      
      setPlayerHand(formattedPlayerHand);
      const myTotal = calculateHandTotal(formattedPlayerHand);
      setHandTotal(myTotal);

      if (Number(gameData.state) === 3) { // Game finished
        setDealerFullHand(formattedDealerHand);
        setDealerCard(null);
        setDealerTotal(calculateHandTotal(formattedDealerHand));
      } else {
        // During player's turn, only show the first dealer card
        setDealerCard(formattedDealerHand.length > 0 ? formattedDealerHand[0] : null);
        setDealerFullHand([]);
        setDealerTotal(null);
      }
    } catch (err) {
      console.error("Failed to fetch hands:", err);
      setStatus("❌ Failed to fetch hands.");
    }
  };
  
  // Helper function to format raw card numbers
  const formatHandData = (handArray) => {
    return handArray.map(card => {
      const cardNum = Number(card);
      if (cardNum === 1) return "Ace (1 or 11)";
      if (cardNum === 11) return "Jack (10)";
      if (cardNum === 12) return "Queen (10)";
      if (cardNum === 13) return "King (10)";
      return `${cardNum} (${cardNum})`;
    });
  };

  const resetGame = async () => {
    if (!gameContract) return;
    try {
      const tx = await gameContract.forceEndGame(walletAddress);
      await tx.wait();
      setStatus("🔁 Game reset successfully.");
      await fetchGameState();
      await fetchHands();
      await checkIfPlayerHasGame(gameContract);
      showToast("Game force-ended.", "gray");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to reset game.");
    }
  };

  const approveLUSD = async () => {
    try {
      const tx = await LUSD.approve(GAME_CONTRACT_ADDRESS, ethers.parseUnits("100000000", 18));
      await tx.wait();
      setStatus("✅ Approved LUSD for betting.");
      setIsApproved(true);
    } catch (err) {
      console.error(err);
      setStatus("❌ Approval failed: " + err.message);
    }
  };

  const placeBet = async () => {
    if (!gameContract || !isApproved) {
      setStatus("❌ Please approve LUSD before betting.");
      return;
    }

    try {
      const gameData = await gameContract.getGameState(walletAddress);
      if (Number(gameData.state) === 1 || Number(gameData.state) === 2) {
        setStatus("⚠️ You already have a game in progress.");
        return;
      }

      const amount = ethers.parseUnits(betAmount, 18);
      const tx = await gameContract.placeBet(amount);
      setStatus("🎮 Placing bet...");
      await tx.wait();
      
      // Refresh all game data
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(gameContract);
      await checkLusdAllowanceAndBalance(LUSD, walletAddress);
      await fetchGameOutcome();
      await fetchPlayerStats();
      
      // Check if player got blackjack
      const updatedGameData = await gameContract.getGameState(walletAddress);
      if (updatedGameData.result === "Blackjack") {
        const payout = Number(ethers.formatUnits(updatedGameData.payout, 18));
        showToast(`🎰 BLACKJACK! You won ${payout} LUSD`, "green");
        setStatus(`🎰 BLACKJACK! You won ${payout} LUSD`);
      } else {
        setStatus("🎲 Game started!");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Bet failed: " + (err.reason || err.message || "Please enter a valid number"));
    }
  };

  const hit = async () => {
    if (!gameContract || !hasGame) {
      setStatus("❌ No active game found.");
      return;
    }

    try {
      const gameData = await gameContract.getGameState(walletAddress);
      if (Number(gameData.state) !== 1) {
        setStatus("❌ It's not your turn to hit.");
        return;
      }

      const tx = await gameContract.hit();
      setStatus("🎯 Hitting...");
      await tx.wait();

      // Refresh game data
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(gameContract);
      await fetchGameOutcome();

      const updatedGameData = await gameContract.getGameState(walletAddress);
      if (Number(updatedGameData.state) === 3) {
        if (updatedGameData.result === "Bust") {
          setStatus("💥 You busted! Game over.");
          showToast("💥 You busted!", "red");
        } else {
          setStatus(`🎮 Game over: ${updatedGameData.result}`);
          showToast(`🎮 ${updatedGameData.result}`, updatedGameData.payout > 0 ? "green" : "red");
        }
        await fetchPlayerStats();
        await fetchLeaderboard();
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
    if (!gameContract || !hasGame) {
      setStatus("❌ No active game.");
      return;
    }

    try {
      const gameData = await gameContract.getGameState(walletAddress);
      if (Number(gameData.state) !== 1) {
        setStatus("❌ It's not your turn to stand.");
        return;
      }

      const tx = await gameContract.stand();
      setStatus("🛑 Standing...");
      await tx.wait();

      // Refresh game data
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(gameContract);
      await fetchGameOutcome();

      const updatedGameData = await gameContract.getGameState(walletAddress);
      
      if (updatedGameData.result === "Win") {
        const gain = Number(ethers.formatUnits(updatedGameData.payout, 18));
        setStatus(`🎉 You won! (+${gain} LUSD)`);
        showToast(`🎉 You won! +${gain} LUSD`, "green");
      } else if (updatedGameData.result === "Loss") {
        setStatus("😢 Dealer wins.");
        showToast("😢 Dealer wins.", "red");
      } else if (updatedGameData.result === "Tie") {
        setStatus("🤝 It's a tie.");
        showToast("🤝 It's a tie.", "gray");
      } else {
        setStatus(`🪙 Game ended: ${updatedGameData.result}`);
        showToast(`🪙 ${updatedGameData.result}`, "gray");
      }

      await fetchPlayerStats();
      await fetchLeaderboard();
      await checkLusdAllowanceAndBalance(LUSD, walletAddress);
    } catch (err) {
      console.error("❌ Stand failed: ", err);
      setStatus("❌ Stand failed — possibly not your game or already ended.");
    }
  };

  // Admin functions
  const editPlayerHand = async () => {
    if (!gameContract || !isOwner) return;
    try {
      // Parse the input string to array of numbers
      const cards = editPlayerInput.split(",").map(card => parseInt(card.trim()));
      
      if (cards.some(isNaN) || cards.some(card => card < 1 || card > 13)) {
        showToast("❌ Invalid card values. Use numbers 1-13 separated by commas.", "red");
        return;
      }

      // Note: The edit function has been combined in the contract
      const tx = await gameContract.editHand(editPlayerAddress, true, cards);
      await tx.wait();
      showToast("✅ Player hand edited", "green");
      setEditPlayerInput("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to edit player hand", "red");
    }
  };

  const editDealerHand = async () => {
    if (!gameContract || !isOwner) return;
    try {
      // Parse the input string to array of numbers
      const cards = editDealerInput.split(",").map(card => parseInt(card.trim()));
      
      if (cards.some(isNaN) || cards.some(card => card < 1 || card > 13)) {
        showToast("❌ Invalid card values. Use numbers 1-13 separated by commas.", "red");
        return;
      }

      // Note: The edit function has been combined in the contract
      const tx = await gameContract.editHand(editPlayerAddress, false, cards);
      await tx.wait();
      showToast("✅ Dealer hand edited", "green");
      setEditDealerInput("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to edit dealer hand", "red");
    }
  };

  const withdrawFunds = async () => {
    if (!gameContract || !isOwner) return;
    try {
      const amount = ethers.parseUnits(withdrawAmount, 18);
      const tx = await gameContract.withdraw(amount);
      await tx.wait();
      showToast(`✅ Withdrew ${withdrawAmount} LUSD`, "green");
      setWithdrawAmount("");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to withdraw funds", "red");
    }
  };

  const withdrawAllFunds = async () => {
    if (!gameContract || !isOwner) return;
    try {
      const tx = await gameContract.withdraw(0); // 0 means withdraw all in the new contract
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

  const saveUsername = async () => {
    if (username.trim()) {
      try {
        localStorage.setItem("playerName", username);
        
        if (statsContract) {
          const tx = await statsContract.setName(username);
          await tx.wait();
          await fetchLeaderboard(statsContract);
          showToast(`Username saved as ${username}`, "green");
        } else {
          showToast(`Username saved locally as ${username}`, "green");
        }
      } catch (err) {
        console.error("Failed to set name on contract:", err);
        showToast("Saved name locally, but failed to update on blockchain", "orange");
      }
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
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "0.5rem" }}>
          <div><strong>Wins:</strong> {playerStats.wins}</div>
          <div><strong>Losses:</strong> {playerStats.losses}</div>
          <div><strong>Ties:</strong> {playerStats.ties}</div>
          <div><strong>Blackjacks:</strong> {playerStats.blackjacks}</div>
          <div><strong>Games Played:</strong> {playerStats.gamesPlayed}</div>
          <div><strong>Current Streak:</strong> {playerStats.currentStreak}</div>
          <div><strong>Longest Streak:</strong> {playerStats.longestStreak}</div>
          <div><strong>Biggest Win:</strong> {playerStats.biggestWin.toFixed(2)} LUSD</div>
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
        {leaderboardEntries.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Rank</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Player</th>
                <th style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardEntries.map((entry, index) => (
                <tr key={index} style={{ 
                  backgroundColor: entry.address.toLowerCase() === walletAddress.toLowerCase() ? "#ffe0b2" : "transparent" 
                }}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {entry.address.toLowerCase() === walletAddress.toLowerCase() 
                      ? <strong>{username || "You"}</strong> 
                      : entry.name || `${entry.address.substring(0, 6)}...${entry.address.substring(38)}`}
                  </td>
                  <td style={{ 
                    padding: "0.5rem", 
                    borderBottom: "1px solid #eee",
                    color: entry.netProfit >= 0 ? "green" : "red",
                    fontWeight: "bold"
                  }}>
                    {entry.netProfit.toFixed(2)} LUSD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No players on the leaderboard yet. Be the first!</p>
        )}
      </div>

      {/* Last Game Result */}
      {gameOutcome.status === "Finished" && gameOutcome.result && (
        <div style={{ 
          marginBottom: "2rem", 
          backgroundColor: gameOutcome.payout > 0 ? "#e8f5e9" : "#ffebee", 
          padding: "1rem", 
          borderRadius: "8px" 
        }}>
          <h3>🎮 Last Game Result</h3>
          <p style={{ 
            fontWeight: "bold", 
            fontSize: "1.2rem",
            color: gameOutcome.payout > 0 ? "green" : (gameOutcome.result === "Tie" ? "gray" : "red")
          }}>
            {gameOutcome.result === "Win" ? "You won!" : 
             gameOutcome.result === "Loss" ? "Dealer won" :
             gameOutcome.result === "Tie" ? "It was a tie" :
             gameOutcome.result === "Blackjack" ? "BLACKJACK!" :
             gameOutcome.result === "Bust" ? "You busted" :
             gameOutcome.result}
          </p>
          {gameOutcome.payout > 0 && (
            <p style={{ color: "green", fontWeight: "bold" }}>
              Payout: +{gameOutcome.payout.toFixed(2)} LUSD
            </p>
          )}
        </div>
      )}

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
                    gameContract.forceEndGame(editPlayerAddress)
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
          {!isApproved && (
            <button onClick={approveLUSD} style={{ marginLeft: "1rem" }}>Approve LUSD</button>
          )}
        </div>
      </div>

      {/* Game Area */}
      {hasGame && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "2rem" }}>
          {/* Dealer's Cards */}
          <div>
            <h3>Dealer's Cards</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              {dealerCard && (
                <div style={CARD_STYLE}>
                  {dealerCard}
                </div>
              )}
              {dealerFullHand.length > 0 && dealerFullHand.map((card, index) => (
                <div key={index} style={CARD_STYLE}>
                  {card}
                </div>
              ))}
              {dealerFullHand.length > 0 && (
                <div style={{ 
                  marginLeft: "1rem",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: getTotalColor(dealerTotal)
                }}>
                  Total: {dealerTotal}
                </div>
              )}
            </div>
          </div>

          {/* Player's Cards */}
          <div>
            <h3>Your Cards</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              {playerHand.map((card, index) => (
                <div key={index} style={CARD_STYLE}>
                  {card}
                </div>
              ))}
              {handTotal !== null && (
                <div style={{ 
                  marginLeft: "1rem",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: getTotalColor(handTotal)
                }}>
                  Total: {handTotal}
                </div>
              )}
            </div>
          </div>

          {/* Game Controls */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button 
              onClick={hit} 
              disabled={gameState !== 1}
              style={{ 
                padding: "0.75rem 2rem", 
                fontSize: "1.2rem", 
                fontWeight: "bold",
                backgroundColor: gameState === 1 ? "#4caf50" : "#e0e0e0"
              }}
            >
              Hit
            </button>
            <button 
              onClick={stand} 
              disabled={gameState !== 1}
              style={{ 
                padding: "0.75rem 2rem", 
                fontSize: "1.2rem", 
                fontWeight: "bold",
                backgroundColor: gameState === 1 ? "#f57c00" : "#e0e0e0"
              }}
            >
              Stand
            </button>
          </div>
        </div>
      )}

      {gameState === 3 && (
        <button 
          onClick={startNewGame}
          style={{ 
            padding: "0.75rem 2rem", 
            fontSize: "1.2rem", 
            fontWeight: "bold",
            backgroundColor: "#2196f3",
            color: "white",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            marginTop: "1rem"
          }}
        >
          Start New Game
        </button>
      )}

      <div style={{ marginTop: "3rem", fontSize: "0.8rem", color: "#666" }}>
        <p>🍊 Orange BlackJack — Play on the Ethereum blockchain</p>
        <p>Game Contract: {GAME_CONTRACT_ADDRESS}</p>
        <p>Stats Contract: {STATS_CONTRACT_ADDRESS}</p>
        <p>Your Address: {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : "Not connected"}</p>
      </div>
    </div>
  );
};

export default Game;