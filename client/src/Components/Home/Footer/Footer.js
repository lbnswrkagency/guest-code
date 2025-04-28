import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Footer.scss";

// Import legal components and modal
import LegalModal from "../../Legal/LegalModal";
import Imprint from "../../Legal/Imprint";
import PrivacyPolicy from "../../Legal/PrivacyPolicy";
import TermsOfService from "../../Legal/TermsOfService";

const Footer = () => {
  // State for managing which modal is open
  const [activeModal, setActiveModal] = useState(null);

  // Open modal handler
  const openModal = (modalName) => {
    setActiveModal(modalName);
  };

  // Close modal handler
  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <footer className="appFooter">
      {/* <div className="footer-content">
        <div className="footer-section">
          <h4>GuestCode</h4>
          <p>The Future of Event Management</p>
        </div>
        <div className="footer-section">
          <h4>Links</h4>
          <div className="footer-links">
            <Link to="/register">Sign Up</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
        <div className="footer-section">
          <h4>Contact</h4>
          <a href="mailto:info@guest-code.com">info@guest-code.com</a>
        </div>
      </div> */}
      <div className="appFooter-bottom">
        <div className="appFooter-legal-links">
          <button onClick={() => openModal("imprint")}>Imprint</button>
          <span className="appFooter-divider">|</span>
          <button onClick={() => openModal("privacy")}>Privacy Policy</button>
          <span className="appFooter-divider">|</span>
          <button onClick={() => openModal("terms")}>Terms of Service</button>
        </div>
        <p>&copy; {new Date().getFullYear()} GuestCode</p>
      </div>

      {/* Legal Modals */}
      <LegalModal
        isOpen={activeModal === "imprint"}
        onClose={closeModal}
        title="Imprint"
      >
        <Imprint />
      </LegalModal>

      <LegalModal
        isOpen={activeModal === "privacy"}
        onClose={closeModal}
        title="Privacy Policy"
      >
        <PrivacyPolicy />
      </LegalModal>

      <LegalModal
        isOpen={activeModal === "terms"}
        onClose={closeModal}
        title="Terms of Service"
      >
        <TermsOfService />
      </LegalModal>
    </footer>
  );
};

export default Footer;
