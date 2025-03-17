import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiCalendarEventLine,
  RiTicketLine,
  RiErrorWarningLine,
  RiPaletteLine,
  RiTimeLine,
} from "react-icons/ri";
import ColorPicker from "../ColorPicker/ColorPicker";
import "./CreateTicketDialog.scss";

const CreateTicketDialog = ({ onClose, onSave, initialData = {} }) => {
  const [ticketData, setTicketData] = useState(() => {
    // Process initialData to ensure proper date/time format
    const processedData = {
      name: "",
      price: "",
      originalPrice: "",
      description: "",
      color: "#2196F3",
      hasCountdown: false,
      endDate: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
      endTime: "23:59",
      isLimited: false,
      maxTickets: 100,
      minPurchase: 1,
      maxPurchase: 10,
      ...initialData,
    };

    // If endDate exists in initialData, parse it properly
    if (initialData.endDate) {
      try {
        const endDate = new Date(initialData.endDate);
        if (!isNaN(endDate.getTime())) {
          // Valid date, extract date and time components
          processedData.endDate = endDate.toISOString().split("T")[0];

          // Set endTime from endDate if not explicitly provided
          if (!initialData.endTime) {
            const hours = endDate.getHours().toString().padStart(2, "0");
            const minutes = endDate.getMinutes().toString().padStart(2, "0");
            processedData.endTime = `${hours}:${minutes}`;
          }
        }
      } catch (error) {
        console.error("Error parsing endDate:", error);
      }
    }

    return processedData;
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!ticketData.name.trim()) {
      newErrors.name = "Ticket name is required";
    }

    if (!ticketData.price || isNaN(ticketData.price) || ticketData.price < 0) {
      newErrors.price = "Valid price is required";
    }

    if (
      ticketData.originalPrice &&
      (isNaN(ticketData.originalPrice) || ticketData.originalPrice < 0)
    ) {
      newErrors.originalPrice = "Original price must be a positive number";
    }

    if (ticketData.hasCountdown && !ticketData.endDate) {
      newErrors.endDate = "End date is required when countdown is enabled";
    }

    if (
      ticketData.isLimited &&
      (!Number.isInteger(+ticketData.maxTickets) || +ticketData.maxTickets <= 0)
    ) {
      newErrors.maxTickets = "Maximum tickets must be a positive integer";
    }

    if (
      !Number.isInteger(+ticketData.minPurchase) ||
      +ticketData.minPurchase < 1
    ) {
      newErrors.minPurchase = "Minimum purchase must be at least 1";
    }

    if (
      !Number.isInteger(+ticketData.maxPurchase) ||
      +ticketData.maxPurchase < 1
    ) {
      newErrors.maxPurchase = "Maximum purchase must be at least 1";
    }

    if (+ticketData.minPurchase > +ticketData.maxPurchase) {
      newErrors.minPurchase =
        "Minimum purchase cannot be greater than maximum purchase";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Convert string values to numbers before saving
      const processedData = {
        ...ticketData,
        price: ticketData.price ? parseFloat(ticketData.price) : 0,
        originalPrice: ticketData.originalPrice
          ? parseFloat(ticketData.originalPrice)
          : null,
        maxTickets: ticketData.isLimited
          ? parseInt(ticketData.maxTickets, 10)
          : null,
        minPurchase: parseInt(ticketData.minPurchase, 10),
        maxPurchase: parseInt(ticketData.maxPurchase, 10),
      };

      onSave(processedData);
    }
  };

  const handleChange = (field, value) => {
    setTicketData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when field is changed
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      className="create-ticket-overlay"
      onClick={handleOverlayClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="create-ticket-dialog"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h3>
            <RiTicketLine /> {initialData._id ? "Edit" : "Create"} Ticket
          </h3>
          <motion.button
            className="close-button"
            onClick={onClose}
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiCloseLine />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label>Ticket Name</label>
            <input
              type="text"
              value={ticketData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Early Bird, VIP, Standard"
              className={errors.name ? "error" : ""}
            />
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (€)</label>
              <input
                type="number"
                value={ticketData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="29.99"
                min="0"
                step="0.01"
                className={errors.price ? "error" : ""}
              />
              {errors.price && (
                <span className="error-message">{errors.price}</span>
              )}
            </div>

            <div className="form-group">
              <label className="strikethrough">Original Price (€)</label>
              <input
                type="number"
                value={ticketData.originalPrice}
                onChange={(e) => handleChange("originalPrice", e.target.value)}
                placeholder="39.99"
                min="0"
                step="0.01"
                className={errors.originalPrice ? "error" : ""}
              />
              {errors.originalPrice && (
                <span className="error-message">{errors.originalPrice}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={ticketData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe what this ticket includes..."
              maxLength={500}
              style={{ whiteSpace: "pre-wrap" }}
            />
          </div>

          <div className="form-group">
            <label>Ticket Color</label>
            <motion.div
              className="color-preview-container"
              onClick={() => setShowColorPicker(true)}
              whileHover={{ y: -3, boxShadow: "0 6px 15px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="color-preview"
                style={{ backgroundColor: ticketData.color }}
              />
              <span className="color-value">{ticketData.color}</span>
              <RiPaletteLine className="color-icon" />
            </motion.div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={ticketData.hasCountdown}
                  onChange={(e) =>
                    handleChange("hasCountdown", e.target.checked)
                  }
                />
                Enable Countdown
              </label>
            </div>
          </div>

          {ticketData.hasCountdown && (
            <div className="countdown-container">
              <div className="form-group">
                <label>End Date</label>
                <div className="date-picker-container">
                  <input
                    type="date"
                    value={ticketData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className={errors.endDate ? "error" : ""}
                  />
                </div>
                {errors.endDate && (
                  <span className="error-message">{errors.endDate}</span>
                )}
              </div>

              <div className="form-group">
                <label>End Time</label>
                <div className="input-with-icon">
                  <RiTimeLine />
                  <input
                    type="time"
                    name="endTime"
                    value={ticketData.endTime}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={ticketData.isLimited}
                  onChange={(e) => handleChange("isLimited", e.target.checked)}
                />
                Limited Quantity
              </label>
            </div>

            {ticketData.isLimited && (
              <div className="form-group">
                <label>Maximum Tickets</label>
                <input
                  type="number"
                  value={ticketData.maxTickets}
                  onChange={(e) => handleChange("maxTickets", e.target.value)}
                  min="1"
                  className={errors.maxTickets ? "error" : ""}
                />
                {errors.maxTickets && (
                  <span className="error-message">{errors.maxTickets}</span>
                )}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Minimum Purchase</label>
              <input
                type="number"
                value={ticketData.minPurchase}
                onChange={(e) => handleChange("minPurchase", e.target.value)}
                min="1"
                className={errors.minPurchase ? "error" : ""}
              />
              {errors.minPurchase && (
                <span className="error-message">{errors.minPurchase}</span>
              )}
            </div>

            <div className="form-group">
              <label>Maximum Purchase</label>
              <input
                type="number"
                value={ticketData.maxPurchase}
                onChange={(e) => handleChange("maxPurchase", e.target.value)}
                min="1"
                className={errors.maxPurchase ? "error" : ""}
              />
              {errors.maxPurchase && (
                <span className="error-message">{errors.maxPurchase}</span>
              )}
            </div>
          </div>

          <div className="dialog-actions">
            <motion.button
              type="button"
              className="cancel-button"
              onClick={onClose}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              className="save-button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {initialData._id ? "Save Changes" : "Create Ticket"}
            </motion.button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {showColorPicker && (
          <ColorPicker
            color={ticketData.color}
            onChange={(color) => {
              handleChange("color", color);
              setShowColorPicker(false);
            }}
            onClose={() => setShowColorPicker(false)}
            title="Choose Ticket Color"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CreateTicketDialog;
