import React from "react";
import { Link } from "react-router-dom";
import "./Home.scss";

const Home = () => {
  return (
    <div className="home-container">
      <h1>Guest Code</h1>
      <Link to="/register" className="register-now-button">
        Register Now
      </Link>
    </div>
  );
};

export default Home;
