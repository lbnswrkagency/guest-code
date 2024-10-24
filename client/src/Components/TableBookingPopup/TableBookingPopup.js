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
}) => {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const popupRef = useRef(null);

  // Helper function to determine table type
  const getTableType = (number) => {
    if (["B1", "B2", "B3", "B4", "B5"].includes(number)) return "DJ Area"; // New category for B tables
    if (["P1", "P2", "P3", "P4", "P5", "P6"].includes(number))
      return "Backstage";
    if (["A1", "A2", "A3", "F1", "F2", "F3", "F4"].includes(number))
      return "VIP";
    if (["K1", "K2", "K3", "K4"].includes(number)) return "Premium";
    return "";
  };

  // Helper function to get minimum spend based on table type
  const getMinimumSpend = (tableType) => {
    const minimumSpends = {
      "DJ Area": "340€", // New premium pricing for DJ Area
      Backstage: "170€",
      VIP: "100€",
      Premium: "100€",
      "": "100€", // Default tables
    };
    return minimumSpends[tableType];
  };

  useEffect(() => {
    if (isOpen) {
      setName("");
      setPax(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ name, pax, tableNumber });
  };

  const tableType = getTableType(tableNumber);
  const minimumSpend = getMinimumSpend(tableType);

  return (
    <div
      className="popup-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="popup-container">
        <button className="popup-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="popup-header">
          <h3>
            {tableType && `${tableType} `}Table {tableNumber}
          </h3>
          <p>Enter booking details</p>
          <div className="minimum-spend">Minimum Spend: {minimumSpend}</div>
        </div>

        <div className="popup-form">
          <input
            type="text"
            className="popup-input"
            placeholder="Guest Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="popup-select"
            value={pax}
            onChange={(e) => setPax(parseInt(e.target.value))}
          >
            {[...Array(10)].map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} People
              </option>
            ))}
          </select>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name}
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
