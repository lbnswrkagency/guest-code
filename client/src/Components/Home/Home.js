import React from "react";
import { Link } from "react-router-dom";
import Navigation from "./Navigation/Navigation";
import Footer from "./Footer/Footer";
import "./Home.scss";

const Home = () => {
  return (
    <div className="home">
      <Navigation />

      <main className="home-main">
        <section className="hero">
          <div className="hero-content">
            <h1>GuestCode</h1>
            <p className="subtitle">The Future of Event Management</p>
            <p className="alpha-badge">Alpha</p>
            <p className="description">
              Create, manage, and grow your events with our all-in-one platform.
              Join the alpha and be among the first to revolutionize event
              hosting.
            </p>
            <div className="cta-buttons">
              <Link to="/register" className="cta-button primary">
                Sign Up for Alpha
              </Link>
              <Link to="/login" className="cta-button secondary">
                Login
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="feature">
            <div className="feature-icon">🎟️</div>
            <h3>QR Code Tickets</h3>
            <p>Generate and manage digital tickets with ease</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🌐</div>
            <h3>Event Pages</h3>
            <p>Beautiful, customizable pages for your events</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📱</div>
            <h3>Social Features</h3>
            <p>Build your community around your events</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
