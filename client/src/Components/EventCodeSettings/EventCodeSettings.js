import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiDeleteBinLine,
  RiTeamLine,
  RiTicketLine,
  RiVipLine,
  RiGroupLine,
  RiSettings4Line,
  RiEditLine,
  RiToggleLine,
  RiToggleFill,
  RiPaletteLine,
  RiInfinityFill,
  RiStarLine,
  RiHeartLine,
  RiFireLine,
  RiThumbUpLine,
  RiAwardLine,
  RiMedalLine,
  RiVipCrownLine,
  RiVipDiamondLine,
  RiUserStarLine,
  RiShieldStarLine,
  RiCoupon3Line,
  RiGiftLine,
  RiDoorLockLine,
  RiKey2Line,
  RiShieldKeyholeLine,
  RiUserVoiceLine,
  RiUserFollowLine,
  RiUserHeartLine,
  RiAddLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
} from "react-icons/ri";
import "./EventCodeSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import TicketCodeSettings from "../TicketCodeSettings/TicketCodeSettings";
import ColorPicker from "../ColorPicker/ColorPicker";

const EventCodeSettings = ({
  event,
  codeSettings,
  setCodeSettings,
  onClose,
}) => {
  console.log("[EventCodeSettings] Received props:", {
    event,
    codeSettings,
    codeSettingsType: typeof codeSettings,
    isArray: Array.isArray(codeSettings),
    length: codeSettings?.length,
    rawData: JSON.stringify(codeSettings),
  });
  const toast = useToast();
  const [showAddCodeDialog, setShowAddCodeDialog] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [expandedSettings, setExpandedSettings] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState({});

  // Add state for code deletion confirmation
  const [codeToDelete, setCodeToDelete] = useState(null);
  const [showDeleteCodeDialog, setShowDeleteCodeDialog] = useState(false);

  // Add state for color picker
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedCodeForColor, setSelectedCodeForColor] = useState(null);

  // Add state for icon picker
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedCodeForIcon, setSelectedCodeForIcon] = useState(null);

  // Default colors for different code types
  const defaultColors = {
    guest: "#4CAF50", // Green
    ticket: "#2196F3", // Blue
    friends: "#FF9800", // Orange
    table: "#9C27B0", // Purple
    backstage: "#F44336", // Red
    custom: "#FFC107", // Amber
  };

  // Available icons for selection
  const availableIcons = {
    RiGroupLine: RiGroupLine,
    RiTeamLine: RiTeamLine,
    RiTicketLine: RiTicketLine,
    RiVipLine: RiVipLine,
    RiVipCrownLine: RiVipCrownLine,
    RiVipDiamondLine: RiVipDiamondLine,
    RiUserStarLine: RiUserStarLine,
    RiShieldStarLine: RiShieldStarLine,
    RiStarLine: RiStarLine,
    RiHeartLine: RiHeartLine,
    RiFireLine: RiFireLine,
    RiThumbUpLine: RiThumbUpLine,
    RiAwardLine: RiAwardLine,
    RiMedalLine: RiMedalLine,
    RiCoupon3Line: RiCoupon3Line,
    RiDeleteBinLine: RiDeleteBinLine,
    RiGiftLine: RiGiftLine,
    RiDoorLockLine: RiDoorLockLine,
    RiKey2Line: RiKey2Line,
    RiShieldKeyholeLine: RiShieldKeyholeLine,
    RiUserVoiceLine: RiUserVoiceLine,
    RiUserFollowLine: RiUserFollowLine,
    RiUserHeartLine: RiUserHeartLine,
  };

  // Track changes for each code setting
  const handleLocalChange = (codeSetting, field, value) => {
    if (codeSetting[field] === value) {
      if (unsavedChanges[codeSetting._id]?.[field] !== undefined) {
        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          if (newChanges[codeSetting._id]) {
            delete newChanges[codeSetting._id][field];
            if (Object.keys(newChanges[codeSetting._id]).length === 0) {
              delete newChanges[codeSetting._id];
            }
          }
          return newChanges;
        });
      }
      return;
    }

    setUnsavedChanges((prev) => {
      const newChanges = { ...prev };
      if (!newChanges[codeSetting._id]) {
        newChanges[codeSetting._id] = {};
      }
      newChanges[codeSetting._id][field] = value;
      return newChanges;
    });
  };

  const getCurrentValue = (codeSetting, field) => {
    return unsavedChanges[codeSetting._id]?.[field] !== undefined
      ? unsavedChanges[codeSetting._id][field]
      : codeSetting[field];
  };

  const handleSaveChanges = async (codeSetting) => {
    try {
      const changes = unsavedChanges[codeSetting._id];
      if (!changes) return;

      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          codeSettingId: codeSetting._id,
          ...changes,
        }
      );

      if (response.data) {
        setCodeSettings((prev) =>
          prev.map((cs) =>
            cs._id === codeSetting._id ? { ...cs, ...changes } : cs
          )
        );

        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[codeSetting._id];
          return newChanges;
        });

        // Close the expanded settings panel after saving
        setExpandedSettings((prev) => ({
          ...prev,
          [codeSetting._id]: false,
        }));

        toast.showSuccess("Changes saved successfully");
      }
    } catch (error) {
      toast.showError("Failed to save changes");
      console.error("Error saving changes:", error);
    }
  };

  const toggleSettingsPanel = (codeId) => {
    setExpandedSettings((prev) => ({
      ...prev,
      [codeId]: !prev[codeId],
    }));
  };

  const toggleCodeEnabled = async (codeSetting) => {
    try {
      const newEnabledState = !codeSetting.isEnabled;
      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          codeSettingId: codeSetting._id,
          isEnabled: newEnabledState,
        }
      );

      if (response.data) {
        setCodeSettings((prev) =>
          prev.map((cs) =>
            cs._id === codeSetting._id
              ? { ...cs, isEnabled: newEnabledState }
              : cs
          )
        );

        // Close the expanded settings panel if it's open
        if (expandedSettings[codeSetting._id]) {
          setExpandedSettings((prev) => ({
            ...prev,
            [codeSetting._id]: false,
          }));
        }

        toast.showSuccess(
          `Code ${newEnabledState ? "enabled" : "disabled"} successfully`
        );
      }
    } catch (error) {
      toast.showError("Failed to toggle code status");
      console.error("Error toggling code status:", error);
    }
  };

  const handleCodeNameChange = async (codeSetting, newName) => {
    try {
      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          codeSettingId: codeSetting._id,
          name: newName,
        }
      );

      if (response.data) {
        setCodeSettings((prev) =>
          prev.map((cs) =>
            cs._id === codeSetting._id ? { ...cs, name: newName } : cs
          )
        );
        toast.showSuccess("Code name updated successfully");
      }
    } catch (error) {
      toast.showError("Failed to update code name");
      console.error("Error updating code name:", error);
    }
  };

  const addCustomCode = async () => {
    if (!newCodeName.trim()) {
      toast.showError("Please enter a code name");
      return;
    }

    try {
      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          type: "custom",
          name: newCodeName,
          isEnabled: true,
        }
      );

      if (response.data) {
        // Update code settings with the new data from the response
        setCodeSettings(response.data.codeSettings || []);
        setNewCodeName("");
        setShowAddCodeDialog(false);
        toast.showSuccess("Custom code added successfully");
      }
    } catch (error) {
      toast.showError("Failed to add custom code");
      console.error("Error adding custom code:", error);
    }
  };

  const promptDeleteCodeSetting = (codeSetting) => {
    setCodeToDelete(codeSetting);
    setShowDeleteCodeDialog(true);
  };

  const deleteCodeSetting = async () => {
    if (!codeToDelete) return;

    try {
      const response = await axiosInstance.delete(
        `/code-settings/events/${event._id}/${codeToDelete._id}`
      );

      if (response.data) {
        setCodeSettings((prev) =>
          prev.filter((cs) => cs._id !== codeToDelete._id)
        );
        setShowDeleteCodeDialog(false);
        setCodeToDelete(null);
        toast.showSuccess("Code deleted successfully");
      }
    } catch (error) {
      toast.showError("Failed to delete code");
      console.error("Error deleting code:", error);
    }
  };

  const toggleColorPicker = (codeSetting, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const currentColor =
      getCurrentValue(codeSetting, "color") ||
      defaultColors[codeSetting.type.toLowerCase()];

    setSelectedCodeForColor(codeSetting);
    setShowColorPicker(true);
  };

  const handleColorSelect = async (color) => {
    if (!selectedCodeForColor) return;

    // Update local state
    handleLocalChange(selectedCodeForColor, "color", color);

    // Close the color picker
    setShowColorPicker(false);

    try {
      // Save the color change directly to the backend
      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          codeSettingId: selectedCodeForColor._id,
          color: color,
        }
      );

      if (response.data) {
        // Update the code settings with the new color
        setCodeSettings((prev) =>
          prev.map((cs) =>
            cs._id === selectedCodeForColor._id ? { ...cs, color: color } : cs
          )
        );

        // Clear the unsaved changes for this field since we've saved it
        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          if (newChanges[selectedCodeForColor._id]) {
            delete newChanges[selectedCodeForColor._id].color;
            if (
              Object.keys(newChanges[selectedCodeForColor._id]).length === 0
            ) {
              delete newChanges[selectedCodeForColor._id];
            }
          }
          return newChanges;
        });

        toast.showSuccess("Color updated successfully");
      }
    } catch (error) {
      toast.showError("Failed to update color");
      console.error("Error updating color:", error);
    }
  };

  const toggleIconPicker = (codeSetting, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setSelectedCodeForIcon(codeSetting);
    setShowIconPicker(true);
    console.log("[EventCodeSettings] Toggle icon picker:", {
      codeSetting,
      showIconPicker: !showIconPicker,
    });
  };

  const handleIconSelect = async (iconName) => {
    if (!selectedCodeForIcon) return;

    console.log("[EventCodeSettings] Selected icon:", {
      iconName,
      codeSetting: selectedCodeForIcon,
    });

    // Update local state
    handleLocalChange(selectedCodeForIcon, "icon", iconName);

    // Close the icon picker
    setShowIconPicker(false);

    try {
      // Save the icon change directly to the backend
      const response = await axiosInstance.put(
        `/code-settings/events/${event._id}`,
        {
          codeSettingId: selectedCodeForIcon._id,
          icon: iconName,
        }
      );

      if (response.data) {
        // Update the code settings with the new icon
        setCodeSettings((prev) =>
          prev.map((cs) =>
            cs._id === selectedCodeForIcon._id ? { ...cs, icon: iconName } : cs
          )
        );

        // Clear the unsaved changes for this field since we've saved it
        setUnsavedChanges((prev) => {
          const newChanges = { ...prev };
          if (newChanges[selectedCodeForIcon._id]) {
            delete newChanges[selectedCodeForIcon._id].icon;
            if (Object.keys(newChanges[selectedCodeForIcon._id]).length === 0) {
              delete newChanges[selectedCodeForIcon._id];
            }
          }
          return newChanges;
        });

        toast.showSuccess("Icon updated successfully");
      }
    } catch (error) {
      toast.showError("Failed to update icon");
      console.error("Error updating icon:", error);
    }
  };

  const renderCodeSettingItem = (codeSetting) => {
    console.log(
      "[EventCodeSettings] Rendering code setting item:",
      codeSetting
    );
    const isExpanded = expandedSettings[codeSetting._id];
    const hasUnsavedChanges = !!unsavedChanges[codeSetting._id];
    const codeColor =
      getCurrentValue(codeSetting, "color") ||
      defaultColors[codeSetting.type.toLowerCase()];
    const IconComponent =
      availableIcons[getCurrentValue(codeSetting, "icon")] ||
      availableIcons.RiTicketLine;

    return (
      <div
        key={codeSetting._id}
        className={`settings-item-container ${codeSetting.type.toLowerCase()}-code`}
      >
        <div className="settings-item" style={{ borderLeftColor: codeColor }}>
          <div
            className="item-icon"
            style={{
              backgroundColor: `${codeColor}15`,
              color: codeColor,
            }}
            onClick={(e) => toggleIconPicker(codeSetting, e)}
            title="Change Icon"
          >
            <IconComponent />
          </div>

          <div className="item-name">
            <h4>{codeSetting.name}</h4>
          </div>

          <div className="item-actions">
            <motion.button
              className="color-picker-button"
              onClick={(e) => toggleColorPicker(codeSetting, e)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Change Color"
              style={{
                color: codeColor,
              }}
            >
              <RiPaletteLine />
            </motion.button>

            <motion.button
              className="toggle-button"
              onClick={() => toggleCodeEnabled(codeSetting)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={codeSetting.isEnabled ? "Disable" : "Enable"}
              style={{
                color: codeColor,
              }}
            >
              {codeSetting.isEnabled ? <RiEyeLine /> : <RiEyeOffLine />}
            </motion.button>

            <motion.button
              className="expand-settings-button"
              onClick={() => toggleSettingsPanel(codeSetting._id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Settings"
              style={{
                color: codeColor,
              }}
            >
              <RiSettings4Line />
            </motion.button>

            {codeSetting.type === "custom" && (
              <motion.button
                className="delete-button"
                onClick={() => promptDeleteCodeSetting(codeSetting)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Delete"
              >
                <RiDeleteBinLine />
              </motion.button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="code-settings-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {codeSetting.type === "ticket" ? (
                <TicketCodeSettings
                  event={event}
                  codeSetting={codeSetting}
                  onSave={(updatedCodeSetting) => {
                    // Handle saving ticket code settings
                    setCodeSettings((prev) =>
                      prev.map((cs) =>
                        cs._id === codeSetting._id ? updatedCodeSetting : cs
                      )
                    );
                    setExpandedSettings((prev) => ({
                      ...prev,
                      [codeSetting._id]: false,
                    }));
                  }}
                  onCancel={() => {
                    // Handle canceling ticket code settings
                    setExpandedSettings((prev) => ({
                      ...prev,
                      [codeSetting._id]: false,
                    }));
                  }}
                />
              ) : (
                <div className="code-settings-content">
                  <div className="settings-field">
                    <label>Name</label>
                    {codeSetting.isEditable ? (
                      <div className="editable-name">
                        <input
                          type="text"
                          value={getCurrentValue(codeSetting, "name")}
                          onChange={(e) =>
                            handleLocalChange(
                              codeSetting,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Enter code name"
                        />
                        <RiEditLine className="edit-icon" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={codeSetting.name}
                        disabled
                        className="disabled-input"
                      />
                    )}
                  </div>

                  <div className="settings-field">
                    <label>Icon</label>
                    <div className="icon-selection">
                      <div
                        className="selected-icon"
                        onClick={(e) => toggleIconPicker(codeSetting, e)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: codeColor,
                        }}
                      >
                        <IconComponent style={{ fontSize: "1.5rem" }} />
                        <span>Change Icon</span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Condition</label>
                    <input
                      type="text"
                      value={getCurrentValue(codeSetting, "condition") || ""}
                      onChange={(e) =>
                        handleLocalChange(
                          codeSetting,
                          "condition",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Free entrance until 00:30H"
                    />
                  </div>

                  <div className="settings-field">
                    <label>Max People per Code</label>
                    <div className="max-pax-selector">
                      <select
                        className="pax-select"
                        value={getCurrentValue(codeSetting, "maxPax") || 1}
                        onChange={(e) =>
                          handleLocalChange(
                            codeSetting,
                            "maxPax",
                            parseInt(e.target.value)
                          )
                        }
                      >
                        <option value={1}>1 Person</option>
                        <option value={2}>2 People</option>
                        <option value={3}>3 People</option>
                        <option value={4}>4 People</option>
                        <option value={5}>5 People</option>
                        <option value={6}>6 People</option>
                        <option value={8}>8 People</option>
                        <option value={10}>10 People</option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Code Limit</label>
                    <div className="code-limit-section">
                      <div className="limit-input-wrapper">
                        <input
                          type="number"
                          className="limit-input"
                          value={getCurrentValue(codeSetting, "limit") || ""}
                          onChange={(e) =>
                            handleLocalChange(
                              codeSetting,
                              "limit",
                              e.target.value === ""
                                ? 0
                                : parseInt(e.target.value)
                            )
                          }
                          placeholder="Enter limit"
                          disabled={getCurrentValue(codeSetting, "limit") === 0}
                        />
                      </div>
                      <button
                        className={`unlimited-btn ${
                          getCurrentValue(codeSetting, "limit") === 0 &&
                          "active"
                        }`}
                        onClick={() =>
                          handleLocalChange(
                            codeSetting,
                            "limit",
                            getCurrentValue(codeSetting, "limit") === 0
                              ? 100
                              : 0
                          )
                        }
                      >
                        <RiInfinityFill />
                        Unlimited
                      </button>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Code Color</label>
                    <div className="color-preview-container">
                      <div
                        className="color-preview"
                        style={{ backgroundColor: codeColor }}
                        onClick={(e) => toggleColorPicker(codeSetting, e)}
                      ></div>
                      <span className="color-value">{codeColor}</span>
                    </div>
                  </div>

                  <div className="settings-actions">
                    <button
                      className="save-changes-button"
                      onClick={() => handleSaveChanges(codeSetting)}
                      disabled={!hasUnsavedChanges}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCodeSettings = () => {
    console.log(
      "[EventCodeSettings] Rendering code settings. Total settings:",
      codeSettings?.length,
      "Full data:",
      codeSettings
    );

    if (!Array.isArray(codeSettings) || codeSettings.length === 0) {
      console.log("[EventCodeSettings] No code settings found");
      return (
        <div className="settings-items">
          <div className="no-codes-message">
            No code settings available. Add a custom code to get started.
          </div>
        </div>
      );
    }

    const guestCode = codeSettings.find((s) => s.type === "guest");
    const ticketCode = codeSettings.find((s) => s.type === "ticket");
    const otherCodes = codeSettings.filter(
      (s) => s.type !== "guest" && s.type !== "ticket"
    );

    console.log("[EventCodeSettings] Found codes:", {
      guestCode,
      ticketCode,
      otherCodesCount: otherCodes.length,
      allCodes: codeSettings,
    });

    return (
      <div className="settings-items">
        {guestCode && renderCodeSettingItem(guestCode)}
        {ticketCode && renderCodeSettingItem(ticketCode)}
        {otherCodes.map((codeSetting) => renderCodeSettingItem(codeSetting))}
      </div>
    );
  };

  return (
    <div className="settings-content">
      <div className="settings-group">
        <h3>Code Access</h3>
        {renderCodeSettings()}
      </div>

      <div className="add-code-container">
        <button
          className="add-code-button"
          onClick={() => setShowAddCodeDialog(true)}
        >
          <RiAddLine />
          Add Custom Code
        </button>
      </div>

      {/* Add Code Dialog */}
      {showAddCodeDialog && (
        <div className="modal-overlay">
          <div className="add-code-dialog">
            <h3>Add Custom Code</h3>
            <div className="dialog-content">
              <div className="form-field">
                <label>Code Name</label>
                <input
                  type="text"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="Enter code name"
                />
              </div>
              <div className="dialog-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowAddCodeDialog(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={addCustomCode}
                  disabled={!newCodeName.trim()}
                >
                  Add Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Code Dialog */}
      {showDeleteCodeDialog && (
        <ConfirmDialog
          title="Delete Code"
          message={`Are you sure you want to delete the code "${codeToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={deleteCodeSetting}
          onCancel={() => {
            setShowDeleteCodeDialog(false);
            setCodeToDelete(null);
          }}
          isDangerous={true}
        />
      )}

      {/* Color Picker */}
      {showColorPicker && selectedCodeForColor && (
        <ColorPicker
          color={
            getCurrentValue(selectedCodeForColor, "color") ||
            defaultColors[selectedCodeForColor.type.toLowerCase()]
          }
          onChange={handleColorSelect}
          onClose={() => setShowColorPicker(false)}
          title="Select Code Color"
        />
      )}

      {/* Icon Picker */}
      {showIconPicker && selectedCodeForIcon && (
        <div className="modal-overlay" onClick={() => setShowIconPicker(false)}>
          <div
            className="icon-picker-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Select Icon</h3>
            <div className="icon-options">
              {Object.entries(availableIcons).map(
                ([iconName, IconComponent]) => (
                  <div
                    key={iconName}
                    className="icon-option"
                    onClick={() => handleIconSelect(iconName)}
                  >
                    <IconComponent />
                  </div>
                )
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                onClick={() => setShowIconPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCodeSettings;
