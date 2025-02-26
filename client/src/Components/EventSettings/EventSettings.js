import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiTeamLine,
  RiLockLine,
  RiEyeLine,
  RiTicketLine,
  RiVipLine,
  RiGroupLine,
  RiSettings4Line,
  RiInformationLine,
  RiAddLine,
  RiEditLine,
  RiToggleLine,
  RiToggleFill,
  RiRepeatFill,
} from "react-icons/ri";
import "./EventSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";

const EventSettings = ({ event, onClose }) => {
  const toast = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAddCodeDialog, setShowAddCodeDialog] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [codeSettings, setCodeSettings] = useState([]);
  const [expandedSettings, setExpandedSettings] = useState({});
  const [isPublic, setIsPublic] = useState(event?.isPublic || true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch code settings on component mount
  useEffect(() => {
    fetchCodeSettings();
  }, []);

  const fetchCodeSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `/code-settings/events/${event._id}`
      );

      // If no code settings exist yet, initialize with defaults from the model
      if (
        !response.data.codeSettings ||
        response.data.codeSettings.length === 0
      ) {
        console.log("No code settings found, initializing defaults");
        // Use the legacy settings to initialize
        const defaultSettings = [
          {
            name: "Guest Code",
            type: "guest",
            condition: event?.guestCodeSettings?.condition || "",
            maxPax: event?.guestCodeSettings?.maxPax || 1,
            limit: event?.guestCodeSettings?.limit || 0,
            isEnabled: event?.guestCode || false,
            isEditable: false,
            _id: "guest-" + Date.now(), // Temporary ID for frontend use
          },
          {
            name: "Ticket Code",
            type: "ticket",
            condition: event?.ticketCodeSettings?.condition || "",
            maxPax: 1,
            limit: 0,
            isEnabled: event?.ticketCode || false,
            isEditable: false,
            _id: "ticket-" + Date.now(), // Temporary ID for frontend use
          },
          {
            name: "Friends Code",
            type: "friends",
            condition: event?.friendsCodeSettings?.condition || "",
            maxPax: event?.friendsCodeSettings?.maxPax || 1,
            limit: 0,
            isEnabled: event?.friendsCode || false,
            isEditable: true,
            _id: "friends-" + Date.now(), // Temporary ID for frontend use
          },
          {
            name: "Backstage Code",
            type: "backstage",
            condition: event?.backstageCodeSettings?.condition || "",
            maxPax: event?.backstageCodeSettings?.maxPax || 1,
            limit: 0,
            isEnabled: event?.backstageCode || false,
            isEditable: true,
            _id: "backstage-" + Date.now(), // Temporary ID for frontend use
          },
        ];

        // Set these defaults in the local state first
        setCodeSettings(defaultSettings);

        try {
          // Then try to save them to the server
          await Promise.all(
            defaultSettings.map((setting) =>
              axiosInstance.put(`/code-settings/events/${event._id}`, {
                type: setting.type,
                name: setting.name,
                condition: setting.condition,
                maxPax: setting.maxPax,
                limit: setting.limit,
                isEnabled: setting.isEnabled,
                isEditable: setting.isEditable,
              })
            )
          );

          // Fetch the settings again to get the IDs
          const updatedResponse = await axiosInstance.get(
            `/code-settings/events/${event._id}`
          );
          if (
            updatedResponse.data.codeSettings &&
            updatedResponse.data.codeSettings.length > 0
          ) {
            setCodeSettings(updatedResponse.data.codeSettings);
          }
        } catch (saveError) {
          console.error("Error saving default settings:", saveError);
          // We already set the defaults in state with temporary IDs, so we can continue
          // No need to show an error toast if it's an auth error (401/403)
          if (
            saveError.response &&
            (saveError.response.status === 401 ||
              saveError.response.status === 403)
          ) {
            toast.showInfo("Using default settings (view-only mode)");
          } else {
            toast.showInfo("Using default settings (not saved to server)");
          }
        }
      } else {
        setCodeSettings(response.data.codeSettings);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching code settings:", error);
      // If we can't fetch settings, initialize with defaults anyway
      const defaultSettings = [
        {
          name: "Guest Code",
          type: "guest",
          condition: event?.guestCodeSettings?.condition || "",
          maxPax: event?.guestCodeSettings?.maxPax || 1,
          limit: event?.guestCodeSettings?.limit || 0,
          isEnabled: event?.guestCode || false,
          isEditable: false,
          _id: "guest-" + Date.now(), // Temporary ID for frontend use
        },
        {
          name: "Ticket Code",
          type: "ticket",
          condition: event?.ticketCodeSettings?.condition || "",
          maxPax: 1,
          limit: 0,
          isEnabled: event?.ticketCode || false,
          isEditable: false,
          _id: "ticket-" + Date.now(),
        },
        {
          name: "Friends Code",
          type: "friends",
          condition: event?.friendsCodeSettings?.condition || "",
          maxPax: event?.friendsCodeSettings?.maxPax || 1,
          limit: 0,
          isEnabled: event?.friendsCode || false,
          isEditable: true,
          _id: "friends-" + Date.now(),
        },
        {
          name: "Backstage Code",
          type: "backstage",
          condition: event?.backstageCodeSettings?.condition || "",
          maxPax: event?.backstageCodeSettings?.maxPax || 1,
          limit: 0,
          isEnabled: event?.backstageCode || false,
          isEditable: true,
          _id: "backstage-" + Date.now(),
        },
      ];

      setCodeSettings(defaultSettings);

      // Show different message based on error type
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        toast.showInfo("Using default settings (view-only mode)");
      } else {
        toast.showError("Failed to fetch code settings from server");
      }

      setIsLoading(false);
    }
  };

  // Toggle code settings panel
  const toggleSettingsPanel = (codeId) => {
    setExpandedSettings((prev) => ({
      ...prev,
      [codeId]: !prev[codeId],
    }));
  };

  // Toggle code enabled/disabled
  const toggleCodeEnabled = async (codeSetting) => {
    try {
      // Update local state first for immediate UI feedback
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, isEnabled: !setting.isEnabled }
            : setting
        )
      );

      // Check if this is a temporary frontend-only setting
      const isTemporary =
        typeof codeSetting._id === "string" && codeSetting._id.includes("-");

      if (!isTemporary) {
        // If it's a real server-side setting, update it
        try {
          const response = await axiosInstance.put(
            `/code-settings/events/${event._id}`,
            {
              codeSettingId: codeSetting._id,
              isEnabled: !codeSetting.isEnabled,
              type: codeSetting.type,
            }
          );

          toast.showSuccess(
            `${codeSetting.name} ${
              !codeSetting.isEnabled ? "enabled" : "disabled"
            }`
          );
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            toast.showError(`Failed to update ${codeSetting.name} on server`);
            // Revert the local state change on error
            setCodeSettings((prevSettings) =>
              prevSettings.map((setting) =>
                setting._id === codeSetting._id
                  ? { ...setting, isEnabled: codeSetting.isEnabled }
                  : setting
              )
            );
          }
        }
      } else {
        // For temporary settings, try to create it on the server
        try {
          const response = await axiosInstance.put(
            `/code-settings/events/${event._id}`,
            {
              type: codeSetting.type,
              name: codeSetting.name,
              condition: codeSetting.condition,
              maxPax: codeSetting.maxPax,
              limit: codeSetting.limit,
              isEnabled: !codeSetting.isEnabled,
              isEditable: codeSetting.isEditable,
            }
          );

          // If successful, update our local state with the server-generated ID
          if (
            response.data.codeSettings &&
            response.data.codeSettings.length > 0
          ) {
            const newServerSetting = response.data.codeSettings.find(
              (s) => s.type === codeSetting.type
            );

            if (newServerSetting) {
              setCodeSettings((prevSettings) =>
                prevSettings.map((setting) =>
                  setting._id === codeSetting._id ? newServerSetting : setting
                )
              );
            }
          }

          toast.showSuccess(
            `${codeSetting.name} ${
              !codeSetting.isEnabled ? "enabled" : "disabled"
            }`
          );
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            console.error("Error creating code setting on server:", error);
            toast.showInfo(`${codeSetting.name} updated locally only`);
          }
        }
      }
    } catch (error) {
      // Revert the local state change on error
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, isEnabled: codeSetting.isEnabled }
            : setting
        )
      );
      toast.showError(`Failed to update ${codeSetting.name}`);
    }
  };

  // Handle code settings change
  const handleCodeSettingChange = async (codeSetting, field, value) => {
    try {
      // Update local state first for immediate UI feedback
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, [field]: value }
            : setting
        )
      );

      // Check if this is a temporary frontend-only setting
      const isTemporary =
        typeof codeSetting._id === "string" && codeSetting._id.includes("-");

      if (!isTemporary) {
        // If it's a real server-side setting, update it
        try {
          await axiosInstance.put(`/code-settings/events/${event._id}`, {
            codeSettingId: codeSetting._id,
            [field]: value,
            type: codeSetting.type,
          });

          toast.showSuccess(`${codeSetting.name} updated`);
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            console.error("Error updating code setting on server:", error);
            toast.showError(`Failed to update ${codeSetting.name} on server`);
            // Revert the local state change on error
            setCodeSettings((prevSettings) =>
              prevSettings.map((setting) =>
                setting._id === codeSetting._id
                  ? { ...setting, [field]: codeSetting[field] }
                  : setting
              )
            );
          }
        }
      } else {
        // For temporary settings, try to create it on the server
        try {
          const response = await axiosInstance.put(
            `/code-settings/events/${event._id}`,
            {
              type: codeSetting.type,
              name: codeSetting.name,
              condition: codeSetting.condition,
              maxPax: codeSetting.maxPax,
              limit: codeSetting.limit,
              isEnabled: codeSetting.isEnabled,
              isEditable: codeSetting.isEditable,
              [field]: value, // Include the updated field
            }
          );

          // If successful, update our local state with the server-generated ID
          if (
            response.data.codeSettings &&
            response.data.codeSettings.length > 0
          ) {
            const newServerSetting = response.data.codeSettings.find(
              (s) => s.type === codeSetting.type
            );

            if (newServerSetting) {
              setCodeSettings((prevSettings) =>
                prevSettings.map((setting) =>
                  setting._id === codeSetting._id ? newServerSetting : setting
                )
              );
            }
          }

          toast.showSuccess(`${codeSetting.name} updated`);
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            console.error("Error creating code setting on server:", error);
            toast.showInfo(`${codeSetting.name} updated locally only`);
          }
        }
      }
    } catch (error) {
      // Revert the local state change on error
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, [field]: codeSetting[field] }
            : setting
        )
      );
      toast.showError(`Failed to update ${codeSetting.name}`);
      console.error("Error updating code settings:", error);
    }
  };

  // Handle code name change
  const handleCodeNameChange = async (codeSetting, newName) => {
    if (!codeSetting.isEditable) {
      toast.showInfo("This code name cannot be changed");
      return;
    }

    try {
      // Update local state first
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, name: newName }
            : setting
        )
      );

      // Check if this is a temporary frontend-only setting
      const isTemporary =
        typeof codeSetting._id === "string" && codeSetting._id.includes("-");

      if (!isTemporary) {
        // Send update to server
        try {
          await axiosInstance.put(`/code-settings/events/${event._id}`, {
            codeSettingId: codeSetting._id,
            name: newName,
            type: codeSetting.type,
          });

          toast.showSuccess("Code name updated");
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            console.error("Error updating code name on server:", error);
            toast.showError("Failed to update code name on server");
            // Revert the local state change on error
            setCodeSettings((prevSettings) =>
              prevSettings.map((setting) =>
                setting._id === codeSetting._id
                  ? { ...setting, name: codeSetting.name }
                  : setting
              )
            );
          }
        }
      } else {
        // For temporary settings, try to create it on the server
        try {
          const response = await axiosInstance.put(
            `/code-settings/events/${event._id}`,
            {
              type: codeSetting.type,
              name: newName,
              condition: codeSetting.condition,
              maxPax: codeSetting.maxPax,
              limit: codeSetting.limit,
              isEnabled: codeSetting.isEnabled,
              isEditable: codeSetting.isEditable,
            }
          );

          // If successful, update our local state with the server-generated ID
          if (
            response.data.codeSettings &&
            response.data.codeSettings.length > 0
          ) {
            const newServerSetting = response.data.codeSettings.find(
              (s) => s.type === codeSetting.type
            );

            if (newServerSetting) {
              setCodeSettings((prevSettings) =>
                prevSettings.map((setting) =>
                  setting._id === codeSetting._id ? newServerSetting : setting
                )
              );
            }
          }

          toast.showSuccess("Code name updated");
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else {
            console.error("Error creating code setting on server:", error);
            toast.showInfo("Code name updated locally only");
          }
        }
      }
    } catch (error) {
      // Revert the local state change on error
      setCodeSettings((prevSettings) =>
        prevSettings.map((setting) =>
          setting._id === codeSetting._id
            ? { ...setting, name: codeSetting.name }
            : setting
        )
      );
      toast.showError("Failed to update code name");
    }
  };

  // Add a new custom code
  const addCustomCode = async () => {
    if (!newCodeName.trim()) {
      toast.showError("Please enter a name for the code");
      return;
    }

    try {
      try {
        const response = await axiosInstance.put(
          `/code-settings/events/${event._id}`,
          {
            type: "custom",
            name: newCodeName,
            isEnabled: true,
            isEditable: true,
          }
        );

        // Update local state with the new code setting
        if (
          response.data.codeSettings &&
          response.data.codeSettings.length > 0
        ) {
          // Find the newly added custom code (should be the last one)
          const customCodes = response.data.codeSettings.filter(
            (setting) => setting.type === "custom"
          );

          if (customCodes.length > 0) {
            const newCode = customCodes[customCodes.length - 1];
            setCodeSettings((prev) => [...prev, newCode]);
          }
        }

        // Reset form
        setNewCodeName("");
        setShowAddCodeDialog(false);

        toast.showSuccess("New code type added");
      } catch (error) {
        // Handle authentication errors
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          // Add the code locally with a temporary ID
          const tempCode = {
            _id: "custom-" + Date.now(),
            type: "custom",
            name: newCodeName,
            isEnabled: true,
            isEditable: true,
            condition: "",
            maxPax: 1,
            limit: 0,
          };

          setCodeSettings((prev) => [...prev, tempCode]);

          // Reset form
          setNewCodeName("");
          setShowAddCodeDialog(false);

          toast.showInfo("New code added locally (view-only mode)");
        } else {
          toast.showError("Failed to add new code type");
        }
      }
    } catch (error) {
      toast.showError("Failed to add new code type");
    }
  };

  // Delete a custom code
  const deleteCodeSetting = async (codeSetting) => {
    try {
      // Check if this is a temporary frontend-only setting
      const isTemporary =
        typeof codeSetting._id === "string" && codeSetting._id.includes("-");

      // Update local state first
      setCodeSettings((prev) =>
        prev.filter((setting) => setting._id !== codeSetting._id)
      );

      if (!isTemporary) {
        // Delete from server
        try {
          await axiosInstance.delete(
            `/code-settings/events/${event._id}/${codeSetting._id}`
          );
          toast.showSuccess(`${codeSetting.name} deleted`);
        } catch (error) {
          // Handle authentication errors
          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            toast.showInfo(
              "Changes are in view-only mode (not saved to server)"
            );
          } else if (error.response && error.response.status === 400) {
            toast.showError(error.response.data.message);
            // Restore the setting if server deletion fails
            fetchCodeSettings();
          } else {
            toast.showError(`Failed to delete ${codeSetting.name}`);
            // Restore the setting if server deletion fails
            fetchCodeSettings();
          }
        }
      } else {
        toast.showInfo(`${codeSetting.name} removed from view`);
      }
    } catch (error) {
      // Restore the setting if deletion fails
      toast.showError(`Failed to delete ${codeSetting.name}`);
      fetchCodeSettings();
    }
  };

  const handlePublicToggle = async () => {
    try {
      await axiosInstance.put(`/events/${event._id}/settings`, {
        isPublic: !isPublic,
      });

      setIsPublic(!isPublic);
      toast.showSuccess("Visibility updated successfully");
    } catch (error) {
      toast.showError("Failed to update visibility");
    }
  };

  const handleDelete = () => {
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/events/${event._id}`);
      toast.showSuccess("Event deleted successfully");
      onClose();
    } catch (error) {
      toast.showError("Failed to delete event");
    }
    setShowConfirmDialog(false);
  };

  // Render a code setting item
  const renderCodeSettingItem = (codeSetting) => {
    const isExpanded = expandedSettings[codeSetting._id];

    // Choose icon based on code type
    let Icon;
    switch (codeSetting.type) {
      case "guest":
        Icon = RiGroupLine;
        break;
      case "friends":
        Icon = RiTeamLine;
        break;
      case "ticket":
        Icon = RiTicketLine;
        break;
      case "table":
        Icon = RiVipLine;
        break;
      case "backstage":
        Icon = RiVipLine;
        break;
      default:
        Icon = RiGroupLine;
    }

    return (
      <div key={codeSetting._id} className="settings-item-container">
        <div
          className={`settings-item ${codeSetting.isEnabled ? "active" : ""}`}
        >
          <div className="item-icon">
            <Icon />
          </div>
          <div className="item-content">
            <h4>{codeSetting.name}</h4>
            <p>
              {codeSetting.isEnabled
                ? `${codeSetting.name} is enabled`
                : `${codeSetting.name} is disabled`}
            </p>
          </div>
          <div className="item-actions">
            <motion.button
              className="toggle-button"
              onClick={() => toggleCodeEnabled(codeSetting)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={codeSetting.isEnabled ? "Disable" : "Enable"}
            >
              {codeSetting.isEnabled ? <RiToggleFill /> : <RiToggleLine />}
            </motion.button>

            <motion.button
              className="expand-settings-button"
              onClick={() => toggleSettingsPanel(codeSetting._id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Settings"
            >
              <RiSettings4Line />
            </motion.button>

            {codeSetting.type === "custom" && (
              <motion.button
                className="delete-button"
                onClick={() => deleteCodeSetting(codeSetting)}
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
              <div className="code-settings-content">
                {codeSetting.isEditable && (
                  <div className="settings-field">
                    <label>Name</label>
                    <div className="editable-name">
                      <input
                        type="text"
                        value={codeSetting.name}
                        onChange={(e) =>
                          handleCodeNameChange(codeSetting, e.target.value)
                        }
                        placeholder="Code Name"
                      />
                      <RiEditLine className="edit-icon" />
                    </div>
                  </div>
                )}

                <div className="settings-field">
                  <label>Condition</label>
                  <input
                    type="text"
                    placeholder="e.g., Free entrance until 00:30H"
                    value={codeSetting.condition}
                    onChange={(e) =>
                      handleCodeSettingChange(
                        codeSetting,
                        "condition",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="settings-field">
                  <label>Max People per Code</label>
                  <div className="max-pax-selector">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={`pax-${num}`}
                        className={`pax-option ${
                          codeSetting.maxPax === num ? "active" : ""
                        }`}
                        onClick={() =>
                          handleCodeSettingChange(codeSetting, "maxPax", num)
                        }
                      >
                        {num} {num === 1 ? "Person" : "People"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-field">
                  <label>Code Limit</label>
                  <div className="code-limit-section">
                    <div className="limit-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        value={codeSetting.limit === 0 ? "" : codeSetting.limit}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleCodeSettingChange(
                            codeSetting,
                            "limit",
                            value === "" ? 0 : parseInt(value)
                          );
                        }}
                        placeholder="Enter limit"
                        className="limit-input"
                      />
                    </div>
                    <button
                      className={`unlimited-btn ${
                        codeSetting.limit === 0 ? "active" : ""
                      }`}
                      onClick={() =>
                        handleCodeSettingChange(
                          codeSetting,
                          "limit",
                          codeSetting.limit === 0 ? 100 : 0
                        )
                      }
                    >
                      <RiRepeatFill />
                      <span>Unlimited</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="event-settings">
      <div className="settings-header">
        <h2>Event Settings</h2>
        <motion.button
          className="close-button"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RiCloseLine />
        </motion.button>
      </div>

      <div className="settings-content">
        <div className="settings-group">
          <h3>Visibility</h3>
          <div className="settings-items">
            <button
              className={`settings-item ${isPublic ? "active" : ""}`}
              onClick={handlePublicToggle}
            >
              <div className="item-icon">
                <RiEyeLine />
              </div>
              <div className="item-content">
                <h4>Public Event</h4>
                <p>
                  {isPublic
                    ? "Event is visible to everyone"
                    : "Event is private"}
                </p>
              </div>
              <div className="item-actions">
                <motion.div
                  className="toggle-button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isPublic ? <RiToggleFill /> : <RiToggleLine />}
                </motion.div>
              </div>
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Code Access</h3>
          {isLoading ? (
            <div className="loading-indicator">Loading code settings...</div>
          ) : (
            <>
              <div className="settings-items">
                {/* Render fixed code types first (Guest and Ticket) */}
                {codeSettings
                  .filter(
                    (setting) =>
                      setting.type === "guest" || setting.type === "ticket"
                  )
                  .map((setting) => (
                    <div key={setting._id}>
                      {renderCodeSettingItem(setting)}
                    </div>
                  ))}

                {/* Then render editable code types */}
                {codeSettings
                  .filter(
                    (setting) =>
                      setting.type !== "guest" && setting.type !== "ticket"
                  )
                  .map((setting) => (
                    <div key={setting._id}>
                      {renderCodeSettingItem(setting)}
                    </div>
                  ))}
              </div>

              <div className="add-code-container">
                <motion.button
                  className="add-code-button"
                  onClick={() => setShowAddCodeDialog(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiAddLine />
                  <span>Add Custom Code</span>
                </motion.button>
              </div>
            </>
          )}
        </div>

        <div className="settings-group danger-zone">
          <h3>Danger Zone</h3>
          <div className="settings-items">
            <button className="settings-item danger" onClick={handleDelete}>
              <div className="item-icon">
                <RiDeleteBinLine />
              </div>
              <div className="item-content">
                <h4>Delete Event</h4>
                <p>Permanently delete this event and all its data</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}

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
                  onClick={() => {
                    setShowAddCodeDialog(false);
                    setNewCodeName("");
                  }}
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
    </div>
  );
};

export default EventSettings;
