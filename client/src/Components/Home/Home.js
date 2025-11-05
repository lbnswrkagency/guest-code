import React from "react";
import { useLocation, useParams } from "react-router-dom";
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

      {/* Feed-first content - Events are now the primary focus */}
      <main className="home-main">
        <EventOverview />
      </main>

      {/* Secondary content pushed to bottom */}
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Home;
