import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./RegisterBanner.scss";

const RegisterBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="register-banner">
      <div className="register-banner__content">
        <motion.h2
          className="register-banner__title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          BECOME A MEMBER
        </motion.h2>
        <motion.ul
          className="register-banner__perks"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <li>2x Friends Codes per event</li>
          <li>Free Entrance for you and a friend</li>
          <li>Access to exclusive rewards</li>
        </motion.ul>
        <motion.button
          className="register-banner__cta"
          onClick={() => navigate("/register")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          REGISTER NOW
        </motion.button>
      </div>
      <div className="register-banner__image-container">
        <img
          src="/image/codesample.png"
          alt="Friends Code Example"
          className="register-banner__image"
        />
      </div>
    </section>
  );
};

export default RegisterBanner;
