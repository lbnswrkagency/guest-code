import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navigation from "../Navigation/Navigation";
import Footer from "./Footer/Footer";
import ContactSection from "./ContactSection/ContactSection";
import HomeHeader from "../HomeHeader/HomeHeader";
import "./Home.scss";

const Home = () => {
  const location = useLocation();
  const params = useParams();

  return (
    <div className="home">
      <Navigation />

      <header className="home-header">
        {/* 3D Background Layer */}
        <div className="three-d-layer">
          <HomeHeader />
        </div>

        {/* Reduced opacity for the animated background */}
        <div className="animated-background" style={{ opacity: 0.7 }}>
          {/* Nebula effects */}
          <div className="nebula-container">
            <div className="nebula"></div>
            <div className="nebula"></div>
            <div className="nebula"></div>
          </div>

          {/* Star field - reduced opacity to let 3D effects show through */}
          <div className="star-container" style={{ opacity: 0.6 }}>
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

          {/* Other effects with reduced quantities for better performance */}
          <div className="meteor-container">
            {[...Array(2)].map((_, i) => (
              <div key={`meteor-${i}`} className="meteor"></div>
            ))}
          </div>

          <div className="shooting-star-container">
            {[...Array(2)].map((_, i) => (
              <div key={`shooting-star-${i}`} className="shooting-star"></div>
            ))}
          </div>

          <div className="particles-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className={`particle particle-${i + 1}`}
              ></div>
            ))}
          </div>

          <div className="dust-container">
            {[...Array(80)].map((_, i) => (
              <div key={`dust-${i}`} className="dust-particle"></div>
            ))}
          </div>

          <div className="lightning-container">
            <div className="lightning"></div>
          </div>

          <div className="vortex"></div>
          <div className="glow-overlay"></div>
        </div>

        {/* Keep the header content in front */}
        <div
          className="header-content"
          style={{ position: "relative", zIndex: 20 }}
        >
          <h1>GuestCode</h1>
          <p className="subtitle">The Future of Event Management</p>
          <Link to="/login" className="alpha-badge-link">
            <span className="alpha-badge">Alpha</span>
          </Link>
        </div>
      </header>

      {/* Contact Section */}
      <ContactSection />

      <Footer />
    </div>
  );
};

export default Home;
