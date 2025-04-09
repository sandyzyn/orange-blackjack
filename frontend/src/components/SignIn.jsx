import React, { useState } from "react";
import { ethers } from "ethers";

function SignIn({ setAddress }) {
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAddress(accounts[0]);
      } catch (err) {
        setError("Connection denied.");
      }
    } else {
      setError("MetaMask not found.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl mb-4">Orange and Blackjack</h1>
      <button onClick={connectWallet} className="p-2 bg-orange-500 text-white rounded">
        Sign in with MetaMask
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default SignIn;