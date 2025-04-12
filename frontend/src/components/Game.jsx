import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract/OrangeBlackJack";

const LUSD_ADDRESS = "0x9142FA65aAEf921Aea2127e88758adeE0510a0F0";
const GAME_STATES = ["NotStarted", "PlayerTurn", "DealerTurn", "Finished"];

const CARD_STYLE = {
  width: "60px",
  height: "90px",
  backgroundColor: "white",
  border: "1px solid black",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.2rem",
  fontWeight: "bold",
};

const Game = () => {
  const [status, setStatus] = useState("🦊 Connect your wallet to begin.");
  const [betAmount, setBetAmount] = useState("");
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerCard, setDealerCard] = useState(null);
  const [contract, setContract] = useState(null);
  const [LUSD, setLUSD] = useState(null);
  const [gameState, setGameState] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [lusdBalance, setLusdBalance] = useState("0");
  const [isApproved, setIsApproved] = useState(false);
  const [hasGame, setHasGame] = useState(false);
  const [username, setUsername] = useState("");

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

  const fetchGameState = async (instance = contract) => {
    if (!instance) return;
    try {
      const state = await instance.getGameState();
      setGameState(Number(state));
    } catch (err) {
      console.error("Failed to get game state", err);
    }
  };

  const fetchHands = async () => {
    if (!contract) return;
    try {
      const hand = await contract.getMyHand();
      const dealer = await contract.getDealerVisibleCard();
      setPlayerHand(hand.map(Number));
      setDealerCard(Number(dealer));
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch hands.");
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

      const newState = await contract.getGameState();
      if (Number(newState) === 3) {
        setStatus("💥 You busted! Game over.");
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

        if (result === "Player wins") {
          setStatus(`🎉 You won! (+${ethers.formatUnits(payout, 18)} LUSD)`);
        } else if (result === "Dealer wins") {
          setStatus("😢 Dealer wins.");
        } else if (result === "Tie") {
          setStatus("🤝 It's a tie.");
        } else {
          setStatus(`🪙 Game ended: ${result}`);
        }
      } else {
        setStatus("🛑 Game over, but no result found.");
      }

      await fetchHands();
      await fetchGameState();
      await checkIfPlayerHasGame(contract);
    } catch (err) {
      console.error("❌ Stand failed: ", err);
      setStatus("❌ Stand failed — possibly not your game or already ended.");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "2rem", fontFamily: "Georgia, serif", textAlign: "center" }}>
      <h1 style={{ color: "#f57c00", fontSize: "2.5rem" }}>
       Welcome {username || "playerName"}
      </h1>

      <p><strong>Status:</strong> {status}</p>
      <p><strong>LUSD Balance:</strong> {lusdBalance}</p>
      <p><strong>Game State:</strong> {GAME_STATES[gameState]}</p>

      {!hasGame && (
        <p style={{ color: "darkred", fontWeight: "bold" }}>
          ⚠️ You don’t have an active game yet. Place a bet to start.
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
        <button onClick={placeBet} disabled={!isApproved}>Place Bet</button>
        <button onClick={approveLUSD} disabled={isApproved} style={{ marginLeft: "0.5rem" }}>
          Approve LUSD
        </button>
      </div>

      <h2>🧑 Your Hand</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1rem" }}>
        {playerHand.length > 0
          ? playerHand.map((card, i) => (
              <div key={i} style={CARD_STYLE}>{card}</div>
            ))
          : <p>No cards yet</p>}
      </div>

      <h2>🃏 Dealer's Visible Card</h2>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        {dealerCard !== null ? (
          <div style={CARD_STYLE}>{dealerCard}</div>
        ) : (
          <p>No card revealed yet</p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button onClick={hit} disabled={gameState !== 1 || !hasGame}>
          Hit
        </button>
        <button onClick={stand} disabled={gameState !== 1 || !hasGame}>
          Stand
        </button>
      </div>
    </div>
  );
};

export default Game;
