import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCloseLine,
  RiSaveLine,
  RiTicketLine,
  RiCheckLine,
  RiGlobalLine,
  RiTimeLine,
  RiGroupLine,
  RiPriceTag3Line,
  RiMoneyDollarCircleLine,
  RiEyeLine,
  RiEyeOffLine,
} from "react-icons/ri";
import BrandAttachmentCard from "../BrandAttachmentCard/BrandAttachmentCard";
import "./TicketDetailPanel.scss";

// Available colors for ticket templates
const AVAILABLE_COLORS = [
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#9C27B0", // Purple
  "#FF9800", // Orange
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#FF5722", // Deep Orange
  "#607D8B", // Blue Grey
  "#795548", // Brown
  "#F44336", // Red
  "#ffc807", // Gold (brand color)
  "#8BC34A", // Light Green
];

const TicketDetailPanel = ({ ticket, userBrands, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    originalPrice: 0,
    doorPrice: 0,
    description: "",
    color: "#2196F3",
    hasCountdown: false,
    endDate: "",
    isLimited: false,
    maxTickets: 100,
    minPurchase: 1,
    maxPurchase: 10,
    paxPerTicket: 1,
    paymentMethod: "online",
    isVisible: true,
    goOfflineAtEventStart: false,
    offlineTime: "",
  });

  // Attachments state
  const [attachments, setAttachments] = useState([]);

  // Initialize form when ticket changes
  useEffect(() => {
    if (ticket) {
      setFormData({
        name: ticket.name || "",
        price: ticket.price || 0,
        originalPrice: ticket.originalPrice || 0,
        doorPrice: ticket.doorPrice || 0,
        description: ticket.description || "",
        color: ticket.color || "#2196F3",
        hasCountdown: ticket.hasCountdown || false,
        endDate: ticket.endDate ? new Date(ticket.endDate).toISOString().slice(0, 16) : "",
        isLimited: ticket.isLimited || false,
        maxTickets: ticket.maxTickets || 100,
        minPurchase: ticket.minPurchase || 1,
        maxPurchase: ticket.maxPurchase || 10,
        paxPerTicket: ticket.paxPerTicket || 1,
        paymentMethod: ticket.paymentMethod || "online",
        isVisible: ticket.isVisible !== false,
        goOfflineAtEventStart: ticket.goOfflineAtEventStart || false,
        offlineTime: ticket.offlineTime || "",
      });

      // Convert attachments to our internal format
      if (ticket.attachments) {
        setAttachments(
          ticket.attachments.map((a) => ({
            brandId: a.brandId,
            brandName: a.brandName,
            brandUsername: a.brandUsername,
            brandLogo: a.brandLogo,
            isGlobalForBrand: a.isGlobalForBrand !== false,
          }))
        );
      } else {
        setAttachments([]);
      }
    } else {
      // Reset for new ticket
      setFormData({
        name: "",
        price: 0,
        originalPrice: 0,
        doorPrice: 0,
        description: "",
        color: "#2196F3",
        hasCountdown: false,
        endDate: "",
        isLimited: false,
        maxTickets: 100,
        minPurchase: 1,
        maxPurchase: 10,
        paxPerTicket: 1,
        paymentMethod: "online",
        isVisible: true,
        goOfflineAtEventStart: false,
        offlineTime: "",
      });
      setAttachments([]);
    }
  }, [ticket]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle adding a brand attachment
  const handleAddBrand = (brandId) => {
    const brand = userBrands.find((b) => b._id === brandId);
    if (!brand) return;

    setAttachments((prev) => [
      ...prev,
      {
        brandId: brand._id,
        brandName: brand.name,
        brandUsername: brand.username,
        brandLogo: brand.logo,
        isGlobalForBrand: true,
      },
    ]);
  };

  // Handle updating a brand attachment
  const handleUpdateAttachment = (brandId, updates) => {
    setAttachments((prev) =>
      prev.map((a) => (a.brandId === brandId ? { ...a, ...updates } : a))
    );
  };

  // Handle removing a brand attachment
  const handleRemoveAttachment = (brandId) => {
    setAttachments((prev) => prev.filter((a) => a.brandId !== brandId));
  };

  // Get available brands (not already attached)
  const availableBrands = userBrands.filter(
    (b) => !attachments.find((a) => a.brandId === b._id)
  );

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        ...formData,
        attachments: attachments.map((a) => ({
          brandId: a.brandId,
          isGlobalForBrand: a.isGlobalForBrand,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="ticket-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="ticket-detail-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <h2>{ticket ? "Edit Ticket Template" : "New Ticket Template"}</h2>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>

        <div className="panel-body">
          {/* Ticket Settings Section */}
          <section className="ticket-settings-section">
            <h3>Ticket Settings</h3>

            {/* Color Picker and Name */}
            <div className="form-row visual-row">
              <div className="color-selector">
                <div
                  className="color-preview"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <RiTicketLine />
                </div>

                {showColorPicker && (
                  <div className="color-picker">
                    <div className="picker-section">
                      <h4>Color</h4>
                      <div className="color-grid">
                        {AVAILABLE_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`color-option ${
                              formData.color === color ? "selected" : ""
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleInputChange("color", color)}
                          >
                            {formData.color === color && <RiCheckLine />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="picker-section custom-color-section">
                      <h4>Custom</h4>
                      <div className="custom-color-input">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) => handleInputChange("color", e.target.value)}
                          className="color-picker-input"
                        />
                        <span className="hex-display">{formData.color.toUpperCase()}</span>
                      </div>
                    </div>

                    <button
                      className="done-btn"
                      onClick={() => setShowColorPicker(false)}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              <div className="name-input">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Early Bird, VIP Access"
                />
              </div>
            </div>

            {/* Price Settings */}
            <div className="form-row triple">
              <div className="form-field">
                <label>Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    handleInputChange("price", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="form-field">
                <label>Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) =>
                    handleInputChange("originalPrice", parseFloat(e.target.value) || 0)
                  }
                  placeholder="For showing discount"
                />
              </div>

              <div className="form-field">
                <label>Door Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.doorPrice}
                  onChange={(e) =>
                    handleInputChange("doorPrice", parseFloat(e.target.value) || 0)
                  }
                  placeholder="At entrance"
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-row">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="e.g., Includes free drink and coat check"
                rows={3}
              />
            </div>

            {/* Payment Method */}
            <div className="form-row">
              <label>Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              >
                <option value="online">Online Payment</option>
                <option value="atEntrance">Pay at Entrance</option>
              </select>
            </div>

            {/* Pax Per Ticket */}
            <div className="form-row">
              <label>People per Ticket</label>
              <select
                value={formData.paxPerTicket}
                onChange={(e) =>
                  handleInputChange("paxPerTicket", parseInt(e.target.value))
                }
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "person" : "people"}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Limits */}
            <div className="form-row double">
              <div className="form-field">
                <label>Min Purchase</label>
                <input
                  type="number"
                  min="1"
                  value={formData.minPurchase}
                  onChange={(e) =>
                    handleInputChange("minPurchase", parseInt(e.target.value) || 1)
                  }
                />
              </div>

              <div className="form-field">
                <label>Max Purchase</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxPurchase}
                  onChange={(e) =>
                    handleInputChange("maxPurchase", parseInt(e.target.value) || 10)
                  }
                />
              </div>
            </div>

            {/* Limited Tickets */}
            <div className="form-row checkboxes">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.isLimited}
                  onChange={(e) => handleInputChange("isLimited", e.target.checked)}
                />
                <span>Limited Tickets</span>
              </label>
            </div>

            {formData.isLimited && (
              <div className="form-row">
                <label>Max Tickets Available</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxTickets}
                  onChange={(e) =>
                    handleInputChange("maxTickets", parseInt(e.target.value) || 100)
                  }
                />
              </div>
            )}

            {/* Countdown */}
            <div className="form-row checkboxes">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.hasCountdown}
                  onChange={(e) => handleInputChange("hasCountdown", e.target.checked)}
                />
                <span>Enable Countdown Timer</span>
              </label>
            </div>

            {formData.hasCountdown && (
              <div className="form-row">
                <label>Sale Ends At</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                />
              </div>
            )}

            {/* Visibility */}
            <div className="form-row checkboxes">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.isVisible}
                  onChange={(e) => handleInputChange("isVisible", e.target.checked)}
                />
                <span>Visible to customers</span>
              </label>
            </div>

            {/* Offline Settings */}
            <div className="form-row checkboxes">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.goOfflineAtEventStart}
                  onChange={(e) =>
                    handleInputChange("goOfflineAtEventStart", e.target.checked)
                  }
                />
                <span>Go offline when event starts</span>
              </label>
            </div>

            {!formData.goOfflineAtEventStart && (
              <div className="form-row">
                <label>Go Offline At (optional)</label>
                <input
                  type="time"
                  value={formData.offlineTime}
                  onChange={(e) => handleInputChange("offlineTime", e.target.value)}
                />
              </div>
            )}
          </section>

          {/* Brand Attachments Section */}
          <section className="brand-attachments-section">
            <h3>Attached to Brands</h3>
            <p className="section-description">
              Select which brands and events this ticket should be available for
            </p>

            {attachments.length === 0 ? (
              <div className="no-attachments">
                <RiGlobalLine className="no-attachments-icon" />
                <p>No brands attached yet</p>
                <span>Add a brand to enable this ticket for its events</span>
              </div>
            ) : (
              <div className="attachments-list">
                {attachments.map((attachment) => (
                  <BrandAttachmentCard
                    key={attachment.brandId}
                    attachment={attachment}
                    onUpdate={(updates) =>
                      handleUpdateAttachment(attachment.brandId, updates)
                    }
                    onRemove={() => handleRemoveAttachment(attachment.brandId)}
                  />
                ))}
              </div>
            )}

            {/* Add Brand Button */}
            {availableBrands.length > 0 && (
              <div className="add-brand-section">
                <select
                  className="add-brand-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddBrand(e.target.value);
                    }
                  }}
                >
                  <option value="">+ Attach to brand...</option>
                  {availableBrands.map((brand) => (
                    <option key={brand._id} value={brand._id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableBrands.length === 0 && attachments.length > 0 && (
              <p className="all-brands-attached">
                All your brands have been attached
              </p>
            )}
          </section>
        </div>

        <div className="panel-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <RiSaveLine />
                {ticket ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TicketDetailPanel;
