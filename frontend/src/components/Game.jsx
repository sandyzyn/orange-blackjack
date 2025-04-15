import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { GAME_CONTRACT_ADDRESS, STATS_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, STATS_CONTRACT_ABI } from "../contract/OrangeBlackJack";


const CardAnimationStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes victory {
      0% { opacity: 0; transform: scale(0.5); }
      25% { opacity: 0.5; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
      75% { opacity: 0.8; transform: scale(1.1); }
      100% { opacity: 0; transform: scale(1); }
    }
    
    @keyframes defeat {
      0% { opacity: 0; transform: scale(0.5); }
      25% { opacity: 0.5; transform: scale(0.8); rotate(-3deg); }
      50% { opacity: 1; transform: scale(1.2) rotate(-5deg); }
      75% { opacity: 0.8; transform: scale(1.1) rotate(-3deg); }
      100% { opacity: 0; transform: scale(1); }
    }
  `}} />
);

const LUSD_ADDRESS = "0x9142FA65aAEf921Aea2127e88758adeE0510a0F0";
const OWNER_ADDRESS = "0x29821A88A2CB149b8519d38226f9A8c58Ab6cDA3".toLowerCase();
const GAME_STATES = ["NotStarted", "PlayerTurn", "DealerTurn", "Finished"];

const CARD_STYLE = {
  width: "90px",
  height: "130px",
  backgroundColor: "white",
  border: "1px solid #ccc",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.9rem",
  fontWeight: "bold",
  padding: "0.5rem",
  textAlign: "center",
  margin: "0 10px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  background: "linear-gradient(135deg, #fff 0%, #f8f8f8 50%, #eee 100%)"
};


const formatLargeNumber = (num) => {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + " billion";
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + " million";
  } else {
    return Number(num).toFixed(2);
  }
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

const StatusBar = ({ status }) => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if status contains loading-related keywords
    const loadingTerms = [
      "Placing bet...",
      "Hitting...", 
      "Standing...",
      "Connecting...",
      "Approving...",
      "Waiting for confirmation"
    ];
    
    const isLoadingStatus = loadingTerms.some(term => status.includes(term));
    
    if (isLoadingStatus) {
      setIsLoading(true);
      setProgress(0);
      
      // Create animation over 8 seconds
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 0.6;
        });
      }, 100); // Update every 100ms for smoother animation
      
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
      setProgress(0);
    }
  }, [status]);
  
  // Create boxes for the loading bar
  const totalBoxes = 20;
  const filledBoxes = Math.floor(progress / 100 * totalBoxes);
  
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <strong>Status:</strong> 
        <span>{status}</span>
      </div>
      
      {isLoading && (
        <div style={{ 
          marginTop: "0.5rem",
          display: "flex", 
          gap: "4px",
          width: "100%"
        }}>
          {Array.from({ length: totalBoxes }).map((_, index) => (
            <div
              key={index}
              style={{
                height: "8px",
                flex: 1,
                backgroundColor: index < filledBoxes ? "#4caf50" : "#e0e0e0",
                borderRadius: "2px",
                transition: "background-color 0.2s ease"
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [showOutcomeAnimation, setShowOutcomeAnimation] = useState("");

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
    totalBets: 0,
    gamesPlayed: 0,
    name: ""
  });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [gameOutcome, setGameOutcome] = useState({ status: "", result: "", payout: 0 });
  const [showStats, setShowStats] = useState(false);


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
      
      // Set player hand and total regardless of game state
      setPlayerHand(formattedPlayerHand);
      const playerTotal = calculateHandTotal(formattedPlayerHand);
      setHandTotal(playerTotal);

      if (Number(gameData.state) === 3) { // Game finished
        // For finished games, show dealer's full hand and total
        setDealerFullHand(formattedDealerHand);
        setDealerCard(null); // Clear the dealer's single card view
        setDealerTotal(calculateHandTotal(formattedDealerHand));
      } else if (Number(gameData.state) === 2) { // Dealer's turn
        // Show all dealer cards during dealer's turn
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
      setStatus("🔄 Resetting game... Waiting for confirmation");  // Modified line
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
      setStatus("⏳ Approving LUSD... Waiting for confirmation");  // Modified line
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
      setStatus("🎮 Placing bet... Waiting for confirmation"); 
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
        const payout = formatLargeNumber(Number(ethers.formatUnits(updatedGameData.payout, 18)));
        showToast(`🎰 BLACKJACK! You won ${payout} LUSD`, "green");
        setStatus(`🎰 BLACKJACK! You won ${payout} LUSD`);
        setShowOutcomeAnimation("win");
        setTimeout(() => setShowOutcomeAnimation(""), 6000);
      } else {
        setStatus("🎲 Game started!");
      }
    } catch (err) {
      console.error(err);
      
      if (err.receipt && err.receipt.status === 0) {
        setStatus("❌ Gas fees currently too high; please try again");
        showToast("Gas fees currently too high; please try again", "red");
      } else {
        setStatus("❌ Bet failed: " + (err.reason || err.message || "Unknown error"));
      }
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
      setStatus("🎯 Hitting... Waiting for confirmation");
      await tx.wait();
  
      // Refresh game data after successful hit
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(gameContract);
      await fetchGameOutcome();
  
      const updatedGameData = await gameContract.getGameState(walletAddress);
      if (Number(updatedGameData.state) === 3) {
        if (updatedGameData.result === "Bust") {
          setStatus("💥 You busted! Game over.");
          showToast("💥 You busted!", "red");
          setShowOutcomeAnimation("loss");
          setTimeout(() => setShowOutcomeAnimation(""), 11000);
        } else if (updatedGameData.result === "Win") {
          setStatus(`🎮 You won!`);
          showToast(`🎮 You won!`, "green");
          setShowOutcomeAnimation("win");
          setTimeout(() => setShowOutcomeAnimation(""), 11000);
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
      
      if (err.receipt && err.receipt.status === 0) {
        setStatus("❌ Gas fees currently too high; please try again");
        showToast("Gas fees currently too high; please try again", "red");
      } else {
        setStatus("❌ Hit failed: " + (err.reason || err.message || "Unknown error"));
      }
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
      setStatus("🛑 Standing... Waiting for confirmation");
      await tx.wait();
  
      // Refresh game data
      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(gameContract);
      await fetchGameOutcome();
  
      const updatedGameData = await gameContract.getGameState(walletAddress);
      
      if (updatedGameData.result === "Win") {
        const gain = formatLargeNumber(Number(ethers.formatUnits(updatedGameData.payout, 18)));
        setStatus(`🎉 You won! (+${gain} LUSD)`);
        showToast(`🎉 You won! +${gain} LUSD`, "green");
        setShowOutcomeAnimation("win");
      } else if (updatedGameData.result === "Loss") {
        setStatus("😢 Dealer wins.");
        showToast("😢 Dealer wins.", "red");
        setShowOutcomeAnimation("loss");
      } else if (updatedGameData.result === "Tie") {
        setStatus("🤝 It's a tie.");
        showToast("🤝 It's a tie.", "gray");
      } else {
        setStatus(`🪙 Game ended: ${updatedGameData.result}`);
        showToast(`🪙 ${updatedGameData.result}`, "gray");
      }
      
      // Reset outcome animation after 6 seconds
      setTimeout(() => setShowOutcomeAnimation(""), 6000);
  
      await fetchPlayerStats();
      await fetchLeaderboard();
      await checkLusdAllowanceAndBalance(LUSD, walletAddress);
    } catch (err) {
      console.error(err);
      
      if (err.receipt && err.receipt.status === 0) {
        setStatus("❌ Gas fees currently too high; please try again");
        showToast("Gas fees currently too high; please try again", "red");
      } else {
        setStatus("❌ Stand failed: " + (err.reason || err.message || "Unknown error"));
      }
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
      setStatus("✏️ Editing player hand... Waiting for confirmation");  // Add this line
      await tx.wait();
      setStatus("✅ Player hand edited successfully");  // Add this line
      showToast("✅ Player hand edited", "green");
      setEditPlayerInput("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to edit player hand");  // Add this line
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

      const tx = await gameContract.editHand(editPlayerAddress, false, cards);
      setStatus("✏️ Editing dealer hand... Waiting for confirmation");  // Add this line
      await tx.wait();
      setStatus("✅ Dealer hand edited successfully");  // Add this line
      showToast("✅ Dealer hand edited", "green");
      setEditDealerInput("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to edit dealer hand");  // Add this line
      showToast("❌ Failed to edit dealer hand", "red");
    }
  };

  const withdrawFunds = async () => {
    if (!gameContract || !isOwner) return;
    try {
      const amount = ethers.parseUnits(withdrawAmount, 18);
      const tx = await gameContract.withdraw(amount);
      setStatus("💰 Withdrawing funds... Waiting for confirmation");  // Add this line
      await tx.wait();
      setStatus("✅ Funds withdrawn successfully");  // Add this line
      showToast(`✅ Withdrew ${formatLargeNumber(Number(withdrawAmount))} LUSD`, "green");
      setWithdrawAmount("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to withdraw funds");  // Add this line
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
    <div style={{ minHeight: "100vh", backgroundColor: "#fefefe", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
    <CardAnimationStyles />
    {toast.message && <Toast message={toast.message} color={toast.color} />}
    
    {showOutcomeAnimation === "win" && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999
      }}>
        <div style={{
          fontSize: '4rem',
          color: 'gold',
          textShadow: '0 0 15px rgba(255,215,0,0.7), 0 0 25px rgba(255,215,0,0.5)',
          animation: 'victory 3s ease-in-out',
          fontWeight: 'bold'
        }}>
          YOU WIN!
        </div>
      </div>
    )}

    {showOutcomeAnimation === "loss" && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999
      }}>
        <div style={{
          fontSize: '4rem',
          color: 'red',
          textShadow: '0 0 15px rgba(255,0,0,0.7), 0 0 25px rgba(255,0,0,0.5)',
          animation: 'defeat 3s ease-in-out',
          fontWeight: 'bold'
        }}>
          DEALER WINS
        </div>
      </div>
    )}
  <div style={{ maxWidth: "900px", backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ fontSize: "36px", fontWeight: "600", marginBottom: "20px", textAlign: "center", fontFamily: "Georgia, serif" }}>
        <span style={{ color: "#f97316" }}>Orange</span> <span style={{ color: "#000000" }}>BlackJack</span>
      </h1>
        
        {/* Only show username input if not connected to wallet */}
        {!walletAddress && (
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
        )}

        <p><strong>LUSD Balance:</strong> {formatLargeNumber(Number(lusdBalance))} LUSD</p>
        <p><strong>Game State:</strong> {GAME_STATES[gameState]}</p>

        <p><button 
          onClick={() => setShowStats(true)} 
          style={{ 
            marginTop: "0rem", 
            padding: "0.5rem 1rem", 
            backgroundColor: "#f97316", 
            color: "white", 
            border: "none", 
            borderRadius: "8x", 
            cursor: "pointer", 
            fontFamily: "Georgia, Serif"
          }}
        >
          View Your Stats
        </button></p>
        

        {/* Stats Panel */}
        {showStats && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              fontFamily: "Georgia, serif"
            }}>
              <h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#f97316" }}>Your Stats</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div><strong>Name:</strong> {playerStats.name}</div>
                <div><strong>Wins:</strong> {playerStats.wins}</div>
                <div><strong>Losses:</strong> {playerStats.losses}</div>
                <div><strong>Ties:</strong> {playerStats.ties}</div>
                <div><strong>Blackjacks:</strong> {playerStats.blackjacks}</div>
                <div><strong>Games Played:</strong> {playerStats.gamesPlayed}</div>
                <div><strong>Total Bets:</strong> {formatLargeNumber(Number(playerStats.totalBets))} LUSD</div>
                <div style={{ color: netProfit >= 0 ? "green" : "red" }}>
                  <strong>Net Profit:</strong> {formatLargeNumber(Number(netProfit))} LUSD
                </div>
              </div>
              <button 
                onClick={() => setShowStats(false)} 
                style={{ 
                  marginTop: "1.5rem", 
                  backgroundColor: "#f97316", 
                  color: "white", 
                  padding: "0.5rem 1rem", 
                  border: "none", 
                  borderRadius: "8px", 
                  cursor: "pointer",
                  display: "block",
                  fontFamily: "Georgia, Serif",
                  marginLeft: "auto",
                  marginRight: "auto"
                }}
              >
                Close
              </button>
            </div>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", width: "100%" }}>
        {/* Contract Information */}
        <div style={{ width: "100%", padding: "1rem", backgroundColor: "#fff8dc", borderRadius: "8px" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Contract Information</h4>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              onClick={async () => {
                try {
                  const balance = await LUSD.balanceOf(GAME_CONTRACT_ADDRESS);
                  const formattedBalance = formatLargeNumber(Number(ethers.formatUnits(balance, 18)));
                  showToast(`Contract balance: ${formattedBalance} LUSD`, "blue");
                } catch (err) {
                  console.error(err);
                  showToast("Failed to get contract balance", "red");
                }
              }}
              style={{ marginRight: "1rem" }}
            >
              Check Contract Balance
            </button>
            <button 
              onClick={async () => {
                try {
                  if (!statsContract) return;
                  const allPlayers = await statsContract.getAllPlayers();
                  showToast(`Total players: ${allPlayers.length}`, "blue");
                } catch (err) {
                  console.error(err);
                  showToast("Failed to get player count", "red");
                }
              }}
            >
              Count Players
            </button>
          </div>
        </div>
{/* Player Management */}
<div style={{ width: "100%", padding: "1rem", backgroundColor: "#f0f8ff", borderRadius: "8px" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Player Management</h4>
          <div>
            <input
              type="text"
              placeholder="Player address"
              value={editPlayerAddress}
              onChange={(e) => setEditPlayerAddress(e.target.value)}
              style={{ width: "300px", padding: "0.5rem", marginRight: "0.5rem" }}
            />
            <button 
              onClick={async () => {
                if (!statsContract || !editPlayerAddress) return;
                try {
                  const playerStats = await statsContract.getStats(editPlayerAddress);
                  const netProfit = await statsContract.getNetProfit(editPlayerAddress);
                  
                  const stats = {
                    wins: Number(playerStats.wins),
                    losses: Number(playerStats.losses),
                    ties: Number(playerStats.ties),
                    blackjacks: Number(playerStats.blackjacks),
                    earnings: Number(ethers.formatUnits(playerStats.earnings, 18)).toFixed(2),
                    bets: Number(ethers.formatUnits(playerStats.bets, 18)).toFixed(2),
                    biggestWin: Number(ethers.formatUnits(playerStats.biggestWin, 18)).toFixed(2),
                    currentStreak: Number(playerStats.streak),
                    longestStreak: Number(playerStats.longestStreak),
                    gamesPlayed: Number(playerStats.gamesPlayed),
                    netProfit: Number(ethers.formatUnits(netProfit, 18)).toFixed(2),
                    name: playerStats.name
                  };
                  
                  // Display stats in a more readable format
                  const statsText = Object.entries(stats)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                  
                  console.log(`Player stats for ${editPlayerAddress}:`, stats);
                  showToast(`Retrieved player stats. Check console.`, "green");
                } catch (err) {
                  console.error(err);
                  showToast("Failed to get player stats", "red");
                }
              }}
              style={{ marginRight: "0.5rem" }}
            >
              View Stats
            </button>
            
            <button
              onClick={async () => {
                if (!statsContract || !editPlayerAddress) return;
                try {
                  await statsContract.updateLeaderboard(editPlayerAddress);
                  showToast("Leaderboard updated", "green");
                  await fetchLeaderboard();
                } catch (err) {
                  console.error(err);
                  showToast("Failed to update leaderboard", "red");
                }
              }}
            >
              Update Leaderboard
            </button>
          </div>
        </div>
{/* Edit Hands */}
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
        
        {/* Leaderboard View */}
        <div style={{ width: "100%", padding: "1rem", backgroundColor: "#f0fff0", borderRadius: "8px" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Leaderboard</h4>
          <button onClick={() => fetchLeaderboard()} style={{ marginBottom: "1rem" }}>Refresh Leaderboard</button>
          
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#e9e9e9" }}>
                  <th style={{ padding: "0.5rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>Rank</th>
                  <th style={{ padding: "0.5rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>Player</th>
                  <th style={{ padding: "0.5rem", textAlign: "left", borderBottom: "1px solid #ddd" }}>Name</th>
                  <th style={{ padding: "0.5rem", textAlign: "right", borderBottom: "1px solid #ddd" }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>{index + 1}</td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                      {`${entry.address.substring(0, 6)}...${entry.address.substring(38)}`}
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>{entry.name || "Anonymous"}</td>
                    <td style={{ 
                      padding: "0.5rem", 
                      borderBottom: "1px solid #ddd", 
                      textAlign: "right",
                      color: entry.netProfit >= 0 ? "green" : "red"
                    }}>
                      {formatLargeNumber(Number(entry.netProfit))} LUSD
                    </td>
                  </tr>
                ))}
                {leaderboardEntries.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: "1rem", textAlign: "center" }}>No players on leaderboard yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

  <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
    <input
      type="number"
      placeholder="Enter bet in LUSD"
      value={betAmount}
      onChange={(e) => setBetAmount(e.target.value)}
      style={{
        padding: "0.5rem",
        fontSize: "1rem",
        fontFamily: "Georgia, serif",
        width: "200px",
        marginRight: "1rem"
      }}
    />
    <button
      onClick={placeBet}
      disabled={!isApproved || gameState === 1 || gameState === 2}
      style={{
        fontFamily: "Georgia, serif",
        fontSize: "1rem",
        padding: "0.5rem 1rem",
        cursor: "pointer"
      }}
    >
      Place Bet
    </button>
    {!isApproved && (
      <button
        onClick={approveLUSD}
        style={{
          marginLeft: "1rem",
          fontFamily: "Georgia, serif",
          fontSize: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer"
        }}
      >
        Approve LUSD
      </button>
    )}
  </div>
</div>
<StatusBar status={status} />

{/* Game Area */}
{(hasGame || gameState === 3) && (
  <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "2rem" }}>

{/* Dealer's Cards */}
<div>
  <h3>Dealer's Cards</h3>
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem",
      marginTop: "1rem",
      minHeight: "150px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      {dealerCard && gameState !== 3 && (
        <div style={CARD_STYLE}>
          {dealerCard}
        </div>
      )}
      {dealerFullHand.length > 0 &&
        dealerFullHand.map((card, index) => (
          <div key={index} style={CARD_STYLE}>
            {card}
          </div>
        ))}
    </div>
    <p></p>

    {dealerTotal !== null && (
      <div
        style={{
          fontWeight: "bold",
          fontSize: "1.2rem",
          color: getTotalColor(dealerTotal),
        }}
      >
        Total: {dealerTotal}
      </div>
    )}
  </div>
</div>


{/* Player's Cards */}
<div>
  <h3>Your Cards</h3>
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem",
      marginTop: "1rem",
      minHeight: "150px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      {playerHand.map((card, index) => (
        <div key={index} style={CARD_STYLE}>
          {card}
        </div>
      ))}
    </div>
    <p></p>

    {handTotal !== null && (
      <div
        style={{
          fontWeight: "bold",
          fontSize: "1.2rem",
          color: getTotalColor(handTotal),
        }}
      >
        Total: {handTotal}
      </div>
    )}
  </div>
</div>

{/* Game Outcome Display */}
{gameState === 3 && gameOutcome.result && (
              <div style={{ 
                marginTop: "1rem", 
                padding: "1rem", 
                backgroundColor: 
                  gameOutcome.result === "Win" || gameOutcome.result === "Blackjack" ? "#e6ffe6" : 
                  gameOutcome.result === "Loss" || gameOutcome.result === "Bust" ? "#ffe6e6" : 
                  "#f0f0f0",
                borderRadius: "8px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.2rem"
              }}>
                <div>Result: {gameOutcome.result}</div>
                {gameOutcome.payout > 0 && (
                  <div style={{ color: "green", marginTop: "0.5rem" }}>
                    Payout: {formatLargeNumber(Number(gameOutcome.payout))} LUSD
                  </div>
                )}
              </div>
            )}

            {/* Game Controls */}
            {gameState === 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
                <button 
                  onClick={hit} 
                  style={{ 
                    padding: "0.75rem 2rem", 
                    fontSize: "1.2rem", 
                    fontWeight: "bold",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Hit
                </button>
                <button 
                  onClick={stand} 
                  style={{ 
                    padding: "0.75rem 2rem", 
                    fontSize: "1.2rem", 
                    fontWeight: "bold",
                    backgroundColor: "#f57c00",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Stand
                </button>
              </div>
            )}
          </div>
        )}

        {gameState === 3 && (
          <button 
            onClick={startNewGame}
            style={{ 
              padding: "0.75rem 2rem", 
              fontSize: "1.2rem", 
              fontWeight: "bold",
              backgroundColor: "#f97316",
              color: "white",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              marginTop: "1rem",
              fontFamily: "Georgia, Serif"
            }}
          >
            Start New Game
          </button>
        )}
      </div>

      <div style={{ marginTop: "3rem", fontSize: "0.8rem", color: "#666", textAlign: "center" }}>
        <p>Orange BlackJack — Play on the Ethereum blockchain</p>
        <p>Game Contract: {GAME_CONTRACT_ADDRESS}</p>
        <p>Stats Contract: {STATS_CONTRACT_ADDRESS}</p>
        <p>Your Address: {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : "Not connected"}</p>
        <p>Brought to you by: Arjun Shetty, Brain Zhou, Kaden Kram, Karen Wu, Sandy Zhang</p>
      </div>
    </div>
  );
};

export default Game;