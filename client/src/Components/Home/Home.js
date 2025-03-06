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

      <main className="home-main">
        <section className="hero">
          <div className="hero-content">
            <h1>GuestCode</h1>
            <p className="subtitle">The Future of Event Management</p>
            <span className="alpha-badge">Alpha</span>
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
            <p>
              Generate and manage digital tickets with ease. Streamline your
              event entry process with modern technology.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">🌐</div>
            <h3>Event Pages</h3>
            <p>
              Create beautiful, customizable pages for your events. Showcase
              your brand and engage with your audience.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">📱</div>
            <h3>Social Features</h3>
            <p>
              Build and grow your community around your events. Connect with
              attendees and create lasting relationships.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
