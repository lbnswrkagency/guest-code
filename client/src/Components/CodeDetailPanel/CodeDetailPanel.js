import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCloseLine,
  RiSaveLine,
  RiCodeLine,
  RiAddLine,
  RiCheckLine,
  RiGlobalLine,
  RiMapPinLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiHeartLine,
  RiStarLine,
  RiFireLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
} from "react-icons/ri";
import BrandAttachmentCard from "../BrandAttachmentCard/BrandAttachmentCard";
import "./CodeDetailPanel.scss";

// Available icons for code templates
const AVAILABLE_ICONS = [
  { name: "RiCodeLine", component: RiCodeLine },
  { name: "RiTicketLine", component: RiTicketLine },
  { name: "RiUserLine", component: RiUserLine },
  { name: "RiVipLine", component: RiVipLine },
  { name: "RiTableLine", component: RiTableLine },
  { name: "RiHeartLine", component: RiHeartLine },
  { name: "RiStarLine", component: RiStarLine },
  { name: "RiFireLine", component: RiFireLine },
  { name: "RiThumbUpLine", component: RiThumbUpLine },
  { name: "RiCupLine", component: RiCupLine },
  { name: "RiGift2Line", component: RiGift2Line },
  { name: "RiMedalLine", component: RiMedalLine },
  { name: "RiTrophyLine", component: RiTrophyLine },
];

// Available colors for code templates
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

const CodeDetailPanel = ({ code, userBrands, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    condition: "",
    note: "",
    maxPax: 1,
    defaultLimit: 0,
    color: "#2196F3",
    icon: "RiCodeLine",
    requireEmail: true,
    requirePhone: false,
  });

  // Attachments state
  const [attachments, setAttachments] = useState([]);

  // Initialize form when code changes
  useEffect(() => {
    if (code) {
      setFormData({
        name: code.name || "",
        type: code.type || "custom",
        condition: code.condition || "",
        note: code.note || "",
        maxPax: code.maxPax || 1,
        defaultLimit: code.defaultLimit || 0,
        color: code.color || "#2196F3",
        icon: code.icon || "RiCodeLine",
        requireEmail: code.requireEmail !== false,
        requirePhone: code.requirePhone || false,
      });

      // Convert attachments to our internal format
      if (code.attachments) {
        setAttachments(
          code.attachments.map((a) => ({
            brandId: a.brandId,
            brandName: a.brandName,
            brandUsername: a.brandUsername,
            brandLogo: a.brandLogo,
            isGlobalForBrand: a.isGlobalForBrand !== false,
            enabledEvents: a.enabledEvents || [],
          }))
        );
      } else {
        setAttachments([]);
      }
    } else {
      // Reset for new code
      setFormData({
        name: "",
        type: "custom",
        condition: "",
        note: "",
        maxPax: 1,
        defaultLimit: 0,
        color: "#2196F3",
        icon: "RiCodeLine",
        requireEmail: true,
        requirePhone: false,
      });
      setAttachments([]);
    }
  }, [code]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icon = AVAILABLE_ICONS.find((i) => i.name === iconName);
    return icon ? icon.component : RiCodeLine;
  };

  const IconComponent = getIconComponent(formData.icon);
  const isGuestCode = formData.type === "guest";

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
        enabledEvents: [],
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
          enabledEvents: a.enabledEvents,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="code-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="code-detail-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <h2>{isGuestCode ? "Guest Code Settings" : (code ? "Edit Code Template" : "New Code Template")}</h2>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>

        <div className="panel-body">
          {/* Code Settings Section */}
          <section className="code-settings-section">
            <h3>Code Settings</h3>

            {/* Icon and Color Picker */}
            <div className="form-row visual-row">
              <div className="icon-color-selector">
                <div
                  className="icon-preview"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowIconPicker(!showIconPicker)}
                >
                  <IconComponent />
                </div>

                {showIconPicker && (
                  <div className="icon-picker">
                    <div className="picker-section">
                      <h4>Icon</h4>
                      <div className="icon-grid">
                        {AVAILABLE_ICONS.map((icon) => {
                          const Icon = icon.component;
                          return (
                            <button
                              key={icon.name}
                              className={`icon-option ${
                                formData.icon === icon.name ? "selected" : ""
                              }`}
                              onClick={() => handleInputChange("icon", icon.name)}
                            >
                              <Icon />
                            </button>
                          );
                        })}
                      </div>
                    </div>

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
                      onClick={() => setShowIconPicker(false)}
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
                  placeholder="e.g., Friends Code, VIP Access"
                  disabled={isGuestCode}
                  className={isGuestCode ? "locked" : ""}
                />
                {isGuestCode && (
                  <span className="locked-hint">Name cannot be changed</span>
                )}
              </div>
            </div>

            {/* Condition */}
            <div className="form-row">
              <label>Condition (shown to guests)</label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) => handleInputChange("condition", e.target.value)}
                placeholder="e.g., Free entry before 12am"
              />
            </div>

            {/* Note */}
            <div className="form-row">
              <label>Note (internal)</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => handleInputChange("note", e.target.value)}
                placeholder="e.g., For VIP guests only"
              />
            </div>

            {/* Max Pax & Limit */}
            <div className="form-row double">
              <div className="form-field">
                <label>Max Pax</label>
                <select
                  value={formData.maxPax}
                  onChange={(e) =>
                    handleInputChange("maxPax", parseInt(e.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Default Limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.defaultLimit}
                  onChange={(e) =>
                    handleInputChange(
                      "defaultLimit",
                      parseInt(e.target.value) || 0
                    )
                  }
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            {/* Contact Requirements */}
            <div className="form-row checkboxes">
              <label className="section-label">Contact Requirements</label>
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.requireEmail}
                    onChange={(e) =>
                      handleInputChange("requireEmail", e.target.checked)
                    }
                  />
                  <span>Require Email</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.requirePhone}
                    onChange={(e) =>
                      handleInputChange("requirePhone", e.target.checked)
                    }
                  />
                  <span>Require Phone</span>
                </label>
              </div>
            </div>
          </section>

          {/* Brand Attachments Section */}
          <section className="brand-attachments-section">
            <h3>Attached to Brands</h3>
            <p className="section-description">
              Select which brands and events this code should be available for
            </p>

            {attachments.length === 0 ? (
              <div className="no-attachments">
                <RiGlobalLine className="no-attachments-icon" />
                <p>No brands attached yet</p>
                <span>Add a brand to enable this code for its events</span>
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
                {code ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CodeDetailPanel;
