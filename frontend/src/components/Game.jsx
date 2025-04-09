import React from "react";

function Game({ address }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl">Welcome, {address}</h2>
      <p className="mt-2">This is where the Blackjack game will go 🎮</p>
    </div>
  );
}

export default Game;