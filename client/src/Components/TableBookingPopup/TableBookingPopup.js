import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "./TableBookingPopup.scss";

const TableBookingPopup = ({
  isOpen,
  onClose,
  tableNumber,
  onSubmit,
  position,
  isAdmin,
  isSubmitting,
  isPublic,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState(""); // For non-public facing forms
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pax, setPax] = useState(1);
  const popupRef = useRef(null);

  // Determine if advanced form is needed (for public facing pages)
  const showAdvancedForm = isPublic || position?.showAdvancedForm;
  // Use a simplified form for admin users when not public facing
  const useSimplifiedForm = !showAdvancedForm && isAdmin;

  useEffect(() => {
    if (isOpen) {
      // Reset form fields when popup opens
      setFirstName("");
      setLastName("");
      setName("");
      setEmail("");
      setPhone("");
      setPax(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (useSimplifiedForm) {
      if (!name.trim()) {
        return; // Don't submit if name is empty
      }
    } else {
      if (!firstName.trim() || !lastName.trim()) {
        return; // Don't submit if names are empty
      }
    }

    if (!tableNumber) {
      return; // Don't submit if table number is missing
    }

    // For admin-only simplified view
    if (useSimplifiedForm) {
      onSubmit({
        name, // Use the single name field
        firstName: name.split(" ")[0] || name, // Extract first name for API compatibility
        lastName: name.split(" ").slice(1).join(" ") || "", // Extract last name
        pax,
        tableNumber,
      });
    } else {
      // For public-facing or standard form
      // Create a combined name for backward compatibility
      const fullName = `${firstName} ${lastName}`.trim();

      onSubmit({
        name: fullName,
        firstName,
        lastName,
        email: showAdvancedForm ? email : undefined,
        phone: showAdvancedForm ? phone : undefined,
        pax,
        tableNumber,
      });
    }
  };

  // Get table information from position data
  const tableName = position?.displayName || tableNumber;
  const minSpend = position?.minSpend ? `${position.minSpend}€` : "100€";
  const maxPersons = position?.maxPersons || 10;
  const tableCategory = position?.category || "";

  // Get area name based on category
  let areaName = position?.areaName || "";
  if (!areaName) {
    if (tableCategory === "D") areaName = "Dancefloor";
    if (tableCategory === "V") areaName = "VIP Booth";
    if (tableCategory === "F") areaName = "Front Row";
  }

  // Determine if the form has all required fields filled
  const isFormValid = () => {
    if (!tableNumber) return false;

    if (useSimplifiedForm) {
      // Only name is required for simplified admin form
      return name.trim() !== "";
    } else {
      // Standard form requires first and last name
      const basicFieldsValid =
        firstName.trim() !== "" && lastName.trim() !== "";

      // Advanced form also requires email and phone
      if (showAdvancedForm) {
        return (
          basicFieldsValid &&
          email.trim() !== "" &&
          phone.trim() !== "" &&
          pax > 0
        );
      }

      return basicFieldsValid && pax > 0;
    }
  };

  return (
    <div
      className="popup-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`popup-container ${isPublic ? "public-form" : ""}`}>
        <button className="popup-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="popup-header">
          <h3>{tableName}</h3>
          <p>{areaName || "Table"} Reservation</p>
          <div className="minimum-spend">Minimum Spend: {minSpend}</div>
        </div>

        <div className="popup-form">
          {useSimplifiedForm ? (
            // Simplified form for admin users
            <div className="popup-field">
              <label>Guest Name</label>
              <input
                type="text"
                className="popup-input"
                placeholder="Full Guest Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          ) : (
            // Side-by-side first/last name fields
            <div className="popup-field-row">
              <div className="popup-field">
                <input
                  type="text"
                  className="popup-input"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="popup-field">
                <input
                  type="text"
                  className="popup-input"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {showAdvancedForm && (
            <>
              <div className="popup-field">
                <input
                  type="email"
                  className="popup-input"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="popup-field">
                <input
                  type="tel"
                  className="popup-input"
                  placeholder="Your Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="popup-field">
            <label>Number of People</label>
            <select
              className="popup-select"
              value={pax}
              onChange={(e) => setPax(parseInt(e.target.value))}
            >
              {[...Array(maxPersons)].map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} {index === 0 ? "Person" : "People"}
                </option>
              ))}
            </select>
          </div>

          {isPublic && (
            <div className="popup-notice">
              <p>
                This is a reservation request. We'll contact you via email to
                confirm your table booking.
              </p>
            </div>
          )}
        </div>

        <div className="popup-footer">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid()}
            className="popup-button"
          >
            {isSubmitting
              ? isAdmin
                ? "Booking..."
                : "Submitting..."
              : isAdmin
              ? "Book Reservation"
              : "Request Reservation"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableBookingPopup;
