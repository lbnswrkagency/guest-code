import React, { useState, useEffect } from "react";
import "./FloatingBattle.scss";

const FloatingBattle = ({ onClick }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const battleSignElement = document.querySelector(".battleSign");
      if (battleSignElement) {
        const rect = battleSignElement.getBoundingClientRect();
        setIsVisible(rect.top > window.innerHeight || rect.bottom < 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once to set initial state
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="floating-battle-container">
      <div className="floating-battle" onClick={onClick}>
        <span className="floating-battle-text">Beach Battle Sign Up</span>
        <div className="floating-battle-arrow"></div>
      </div>
    </div>
  );
};

export default FloatingBattle;
