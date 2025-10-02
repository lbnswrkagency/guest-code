import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navigation from "../Navigation/Navigation";
import Footer from "./Footer/Footer";
import ContactSection from "./ContactSection/ContactSection";
import EventOverview from "../EventOverview/EventOverview";
import "./Home.scss";

const Home = () => {
  const location = useLocation();
  const params = useParams();

  return (
    <div className="home">
      <Navigation />

      <header className="home-header">
        {/* Minimalistic animated background */}
        <div className="home-header-background">
          <div className="floating-dots">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`dot dot-${i + 1}`}></div>
            ))}
          </div>
        </div>

        {/* Header content */}
        <div className="home-header-content">
          <h1 className="brand-title">GuestCode</h1>
          <div className="subtitle-container">
            <span className="subtitle-text">The Future of</span>
            <span className="subtitle-highlight">Event Management</span>
          </div>
          <Link to="/login" className="alpha-link">
            <span className="alpha-badge">Alpha</span>
          </Link>
        </div>
      </header>

      {/* Event Overview Section */}
      <EventOverview />

      {/* Contact Section */}
      <ContactSection />

      <Footer />
    </div>
  );
};

export default Home;
