import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./LegalModal.scss";

const LegalModal = ({ isOpen, onClose, title, children }) => {
  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscKeyPress = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    // Add event listener when modal is open
    if (isOpen) {
      document.addEventListener("keydown", handleEscKeyPress);
      // Prevent scrolling on the body when modal is open
      document.body.style.overflow = "hidden";
    }

    // Cleanup function to remove event listener and restore scrolling
    return () => {
      document.removeEventListener("keydown", handleEscKeyPress);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Create portal to render modal directly under the body element
  return ReactDOM.createPortal(
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="legal-modal-content">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default LegalModal;
