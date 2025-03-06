import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navigation from "../Navigation/Navigation";
import Footer from "./Footer/Footer";
import "./Home.scss";

const Home = () => {
  const location = useLocation();
  const params = useParams();

  // Add logging to see when Home is being rendered
  console.log("[Home] Component rendering:", {
    pathname: location.pathname,
    params,
    timestamp: new Date().toISOString(),
  });

  return (
    <div className="home">
      <Navigation />

      <header className="home-header">
        <div className="animated-background">
          {/* Nebula effects */}
          <div className="nebula-container">
            <div className="nebula"></div>
            <div className="nebula"></div>
            <div className="nebula"></div>
          </div>

          {/* Star field */}
          <div className="star-container">
            {[...Array(50)].map((_, i) => (
              <div key={`star-${i}`} className="star"></div>
            ))}
          </div>

          {/* Constellation effect */}
          <div className="constellation-container">
            <svg className="constellation" viewBox="0 0 100 100">
              <path d="M20,30 L40,45 L60,25 L80,40" />
            </svg>
            <svg className="constellation" viewBox="0 0 100 100">
              <path d="M30,70 L50,50 L70,60 L60,80 L40,75 Z" />
            </svg>
          </div>

          {/* Particles */}
          <div className="particles-container">
            {[...Array(25)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className={`particle particle-${i + 1}`}
              ></div>
            ))}
          </div>

          {/* Gold dust */}
          <div className="dust-container">
            {[...Array(100)].map((_, i) => (
              <div key={`dust-${i}`} className="dust-particle"></div>
            ))}
          </div>

          {/* Lightning effect */}
          <div className="lightning-container">
            <div className="lightning"></div>
            <div className="lightning"></div>
          </div>

          {/* Vortex effect */}
          <div className="vortex"></div>

          {/* Glow overlay */}
          <div className="glow-overlay"></div>
        </div>

        <div className="header-content">
          <h1>GuestCode</h1>
          <p className="subtitle">The Future of Event Management</p>
          <span className="alpha-badge">Alpha</span>
        </div>
      </header>

      <Footer />
    </div>
  );
};

export default Home;
