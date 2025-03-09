import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navigation from "../Navigation/Navigation";
import Footer from "./Footer/Footer";
import "./Home.scss";

const Home = () => {
  const location = useLocation();
  const params = useParams();

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

          {/* Star field - increased to 200 stars with varied colors */}
          <div className="star-container">
            {[...Array(200)].map((_, i) => (
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
            <svg className="constellation" viewBox="0 0 100 100">
              <path d="M20,20 L40,30 L60,15 L80,25" />
            </svg>
            <svg className="constellation" viewBox="0 0 100 100">
              <path d="M10,50 L30,60 L50,40 L70,55" />
            </svg>

            {/* Static constellations that pulse */}
            <svg className="constellation-static" viewBox="0 0 100 100">
              <path d="M10,10 L30,20 L50,10 L70,30 L50,50 L30,40 Z" />
            </svg>
            <svg className="constellation-static" viewBox="0 0 100 100">
              <path d="M20,80 L40,70 L60,80 L40,90 Z" />
            </svg>
            <svg className="constellation-static" viewBox="0 0 100 100">
              <path d="M70,20 L80,40 L60,50 L50,30 Z" />
            </svg>

            {/* Constellation dots - increased to 30 and randomly positioned */}
            {[...Array(30)].map((_, i) => (
              <div
                key={`constellation-dot-${i}`}
                className="constellation-dot"
              ></div>
            ))}
          </div>

          {/* Meteors - reduced to 4 */}
          <div className="meteor-container">
            {[...Array(4)].map((_, i) => (
              <div key={`meteor-${i}`} className="meteor"></div>
            ))}
          </div>

          {/* Shooting stars - reduced to 3 */}
          <div className="shooting-star-container">
            {[...Array(3)].map((_, i) => (
              <div key={`shooting-star-${i}`} className="shooting-star"></div>
            ))}
          </div>

          {/* Particles */}
          <div className="particles-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className={`particle particle-${i + 1}`}
              ></div>
            ))}
          </div>

          {/* Gold dust */}
          <div className="dust-container">
            {[...Array(150)].map((_, i) => (
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
          <Link to="/login" className="alpha-badge-link">
            <span className="alpha-badge">Alpha</span>
          </Link>
        </div>
      </header>

      <Footer />
    </div>
  );
};

export default Home;
