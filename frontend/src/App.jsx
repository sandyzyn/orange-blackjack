import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import SignIn from "./components/SignIn";
import Game from "./components/Game";
import InfoPage from "./components/InfoPage";
import Navbar from "./components/Navbar";

function App() {
  const [address, setAddress] = useState(() => localStorage.getItem("walletAddress") || null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (address) {
      localStorage.setItem("walletAddress", address);
    } else {
      localStorage.removeItem("walletAddress");
    }
  }, [address]);

  useEffect(() => {
    // Auto redirect based on sign-in state
    if (!address && location.pathname !== "/signin") {
      navigate("/signin", { replace: true });
    } else if (address && location.pathname === "/signin") {
      navigate("/", { replace: true });
    }
  }, [address, location.pathname, navigate]);

  return (
    <>
      {address && <Navbar setAddress={setAddress} />}
      <Routes>
        <Route path="/signin" element={<SignIn setAddress={setAddress} />} />
        <Route path="/" element={<Game address={address} />} />
        <Route path="/about" element={<InfoPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
