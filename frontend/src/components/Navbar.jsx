import React from "react";
import { Link } from "react-router-dom";

function Navbar({ setAddress }) {
  const signOut = () => setAddress(null);

  return (
    <nav className="flex justify-between items-center p-4 bg-orange-300">
      <div>
        <Link to="/" className="mr-4 font-bold">🎴 Orange and Blackjack</Link>
        <Link to="/about" className="mr-4">How to Play</Link>
      </div>
      <button onClick={signOut} className="bg-white px-3 py-1 rounded">Sign Out</button>
    </nav>
  );
}

export default Navbar;