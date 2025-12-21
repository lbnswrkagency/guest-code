import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../Navigation/Navigation";
import PrivacyPolicy from "./PrivacyPolicy";
import "./LegalPage.scss";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="legal-page">
      <Navigation onBack={handleBack} />
      <div className="legal-page-container">
        <div className="legal-page-content">
          <PrivacyPolicy />
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
