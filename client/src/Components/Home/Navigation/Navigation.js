import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Navigation.scss";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = !isMenuOpen ? "hidden" : "auto";
  };

  return (
    <nav
      className={`home-navigation ${isScrolled ? "scrolled" : ""} ${
        isMenuOpen ? "menu-open" : ""
      }`}
    >
      <div className="nav-content">
        <Link to="/" className="nav-logo">
          GuestCode
        </Link>

        <button
          className="burger-menu"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="burger-line"></span>
          <span className="burger-line"></span>
          <span className="burger-line"></span>
        </button>

        <div className="nav-links">
          <Link
            to="/register"
            className="nav-link"
            onClick={() => isMenuOpen && toggleMenu()}
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="nav-link"
            onClick={() => isMenuOpen && toggleMenu()}
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
