import React from "react";
import { useNavigate } from "react-router-dom";
import "./BackButton.scss";

const BackButton = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <button className="back-button" onClick={handleBack}>
      BACK
    </button>
  );
};

export default BackButton;
