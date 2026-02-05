import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiSaveLine,
  RiCodeLine,
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
  RiPaletteLine,
  RiGlobalLine,
  RiMapPinLine,
  RiDraggable,
  RiCheckLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import "./CodeCreator.scss";

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

// Default icon for each type
const TYPE_DEFAULT_ICONS = {
  guest: "RiUserLine",
  ticket: "RiTicketLine",
  friends: "RiHeartLine",
  table: "RiTableLine",
  backstage: "RiVipLine",
  custom: "RiCodeLine",
};

const CodeCreator = ({ brand, onClose }) => {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const primaryColor = brand?.colors?.primary || "#ffc807";

  // Initial form state
  const initialFormState = {
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
    isGlobal: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch code templates from new CodeTemplate system
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      // Use new CodeTemplate system - fetches codes attached to this brand
      const response = await axiosInstance.get(`/code-templates/brand/${brand._id}`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.log("[CodeCreator] Failed to load templates:", error.message);
      // Don't show error toast - may just be empty
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [brand._id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Get icon component by name
  const getIconComponent = (iconName) => {
    const icon = AVAILABLE_ICONS.find((i) => i.name === iconName);
    return icon ? icon.component : RiCodeLine;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Start editing a template
  const handleStartEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      condition: template.condition || "",
      note: template.note || "",
      maxPax: template.maxPax || 1,
      defaultLimit: template.defaultLimit || 0,
      color: template.color || "#2196F3",
      icon: template.icon || "RiCodeLine",
      requireEmail: template.requireEmail !== false,
      requirePhone: template.requirePhone || false,
      isGlobal: template.isGlobal !== false,
    });
    setShowNewForm(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingTemplate(null);
    setShowNewForm(false);
    setFormData(initialFormState);
    setShowIconPicker(false);
    setShowColorPicker(false);
  };

  // Start creating new template
  const handleStartNew = () => {
    setEditingTemplate(null);
    setFormData(initialFormState);
    setShowNewForm(true);
  };

  // Save template - NOTE: Code management has moved to user-level Codes page
  const handleSave = async () => {
    toast.showInfo("Code management has moved to the Codes page. Visit /@yourusername/codes to create and manage your codes.");
    handleCancel();
  };

  // Delete template - NOTE: Code management has moved to user-level Codes page
  const handleDelete = async () => {
    if (!templateToDelete) return;

    toast.showInfo("Code management has moved to the Codes page. Visit /@yourusername/codes to manage your codes.");
    setShowDeleteConfirm(false);
    setTemplateToDelete(null);
    return;

    // Old code below - no longer used
    try {
      await axiosInstance.delete(
        `/code-templates/${templateToDelete._id}`
      );
      setTemplates((prev) =>
        prev.filter((t) => t._id !== templateToDelete._id)
      );
      toast.showSuccess("Code template deleted");
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to delete code template"
      );
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  // Handle reorder - NOTE: Reordering is now managed at user-level on the Codes page
  const handleReorder = async (newOrder) => {
    setTemplates(newOrder);
    // Reorder is visual-only here - actual reordering happens on the Codes page
  };

  // Render the form for creating/editing
  const renderForm = () => {
    const isEditing = !!editingTemplate;
    const isTypeEditable = !isEditing || editingTemplate.type === "custom";
    const IconComponent = getIconComponent(formData.icon);

    return (
      <motion.div
        className="code-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="form-header">
          <h3>{isEditing ? "Edit Code Template" : "Create New Code"}</h3>
          <button className="close-btn" onClick={handleCancel}>
            <RiCloseLine />
          </button>
        </div>

        <div className="form-body">
          {/* Icon and Color Selection */}
          <div className="form-row visual-row">
            <div className="icon-color-selector">
              <div
                className="icon-preview"
                style={{ backgroundColor: formData.color }}
                onClick={() => setShowIconPicker(!showIconPicker)}
              >
                <IconComponent />
              </div>

              <AnimatePresence>
                {showIconPicker && (
                  <motion.div
                    className="icon-picker"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
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
                              onClick={() => {
                                handleInputChange("icon", icon.name);
                              }}
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
                            onClick={() => {
                              handleInputChange("color", color);
                            }}
                          >
                            {formData.color === color && <RiCheckLine />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="done-btn"
                      onClick={() => setShowIconPicker(false)}
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="name-input">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., VIP Access, Team Member"
                disabled={isEditing && editingTemplate.type !== "custom"}
              />
            </div>
          </div>

          {/* Type Selection (only for new templates) */}
          {isTypeEditable && !isEditing && (
            <div className="form-row">
              <label>Type</label>
              <div className="type-selector">
                {["custom", "ticket", "friends", "table", "backstage"].map(
                  (type) => (
                    <button
                      key={type}
                      className={`type-option ${
                        formData.type === type ? "selected" : ""
                      }`}
                      onClick={() => {
                        handleInputChange("type", type);
                        handleInputChange("icon", TYPE_DEFAULT_ICONS[type]);
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Global Toggle */}
          <div className="form-row toggle-row">
            <div className="toggle-content">
              <div className="toggle-info">
                {formData.isGlobal ? (
                  <RiGlobalLine className="toggle-icon global" />
                ) : (
                  <RiMapPinLine className="toggle-icon specific" />
                )}
                <div className="toggle-text">
                  <span className="toggle-label">
                    {formData.isGlobal ? "Global Code" : "Event-Specific"}
                  </span>
                  <span className="toggle-description">
                    {formData.isGlobal
                      ? "Automatically enabled for all events"
                      : "Manually enable for each event"}
                  </span>
                </div>
              </div>
              <button
                className={`toggle-switch ${formData.isGlobal ? "on" : "off"}`}
                onClick={() =>
                  handleInputChange("isGlobal", !formData.isGlobal)
                }
              >
                <span className="toggle-slider" />
              </button>
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

          {/* Note (internal) */}
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
        </div>

        <div className="form-footer">
          <button className="cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <RiSaveLine />
                {isEditing ? "Update" : "Create"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="code-creator">
      <div className="code-creator-header">
        <div className="header-content">
          <RiCodeLine className="header-icon" style={{ color: primaryColor }} />
          <div className="header-text">
            <h2>Code Creator</h2>
            <p>Manage code templates for {brand?.name}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>
      </div>

      <div className="code-creator-body">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" style={{ borderTopColor: primaryColor }} />
            <p>Loading templates...</p>
          </div>
        ) : (
          <>
            {/* Templates Grid */}
            <Reorder.Group
              axis="x"
              values={templates}
              onReorder={handleReorder}
              className="templates-grid"
            >
              {templates.map((template) => {
                const IconComponent = getIconComponent(template.icon);
                const isSelected = editingTemplate?._id === template._id;

                return (
                  <Reorder.Item
                    key={template._id}
                    value={template}
                    className={`template-card ${isSelected ? "selected" : ""}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="card-drag-handle">
                      <RiDraggable />
                    </div>

                    <div
                      className="card-icon"
                      style={{ backgroundColor: template.color }}
                    >
                      <IconComponent />
                    </div>

                    <div className="card-content">
                      <h4>{template.name}</h4>
                      <div className="card-badges">
                        {template.isGlobal ? (
                          <span className="badge global">
                            <RiGlobalLine /> Global
                          </span>
                        ) : (
                          <span className="badge specific">
                            <RiMapPinLine /> Specific
                          </span>
                        )}
                        {template.type !== "custom" && (
                          <span className="badge type">{template.type}</span>
                        )}
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(template);
                        }}
                      >
                        <RiEditLine />
                      </button>
                      {template.type !== "guest" && (
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateToDelete(template);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <RiDeleteBin6Line />
                        </button>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}

              {/* Add New Card */}
              <motion.div
                className="template-card add-new"
                onClick={handleStartNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ borderColor: primaryColor }}
              >
                <div
                  className="card-icon add-icon"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <RiAddLine style={{ color: primaryColor }} />
                </div>
                <div className="card-content">
                  <h4 style={{ color: primaryColor }}>New Code</h4>
                  <p>Create a new code template</p>
                </div>
              </motion.div>
            </Reorder.Group>

            {/* Edit/Create Form */}
            <AnimatePresence>
              {(editingTemplate || showNewForm) && renderForm()}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && templateToDelete && (
          <ConfirmDialog
            title="Delete Code Template"
            message={`Are you sure you want to delete "${templateToDelete.name}"? This will remove it from all events.`}
            confirmText="Delete"
            type="danger"
            onConfirm={handleDelete}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setTemplateToDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeCreator;
