import React, { useState, useEffect } from "react";
import "./EventSettings.scss";
import { motion } from "framer-motion";
import { RiCloseLine, RiInformationLine } from "react-icons/ri";
import EventCodeSettings from "../EventCodeSettings/EventCodeSettings";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";

const EventSettings = ({ event, onClose }) => {
  const toast = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [codeSettings, setCodeSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced token refresh function - MOVED INSIDE the component
  const refreshTokenAndRetry = async (apiCall) => {
    try {
      console.log("Token refresh initiated");

      // Try to refresh the token first
      const refreshResponse = await axiosInstance.get("/auth/refresh-token");
      console.log("Token refreshed successfully", refreshResponse.data);

      // Ensure token is synced to cookies
      const syncResponse = await axiosInstance.post("/auth/sync-token");
      console.log("Token sync response:", syncResponse.data);

      // If we got here, token refresh was successful, now retry the original API call
      try {
        return await apiCall();
      } catch (retryError) {
        // If we still get an error after token refresh, check if it's a 403
        if (retryError.response && retryError.response.status === 403) {
          console.log(
            "Still getting 403 after token refresh. This appears to be a permissions issue, not an authentication issue:",
            {
              url: retryError.config.url,
              method: retryError.config.method,
              status: retryError.response.status,
              message: retryError.response.data?.message || retryError.message,
            }
          );

          // Show toast to user about permission issue
          toast.showError(
            "You don't have permission to access these settings. Please contact an administrator."
          );
        }
        throw retryError;
      }
    } catch (error) {
      console.error("Error during token refresh:", error);
      throw error;
    }
  };

  const fetchCodeSettings = async () => {
    try {
      console.log("Fetching code settings for event:", event._id);
      const response = await axiosInstance.get(
        `/code-settings/events/${event._id}`
      );

      if (response.data) {
        console.log("Code settings fetched successfully:", response.data);
        setCodeSettings(response.data.codeSettings || []);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        try {
          const data = await refreshTokenAndRetry(fetchCodeSettings);
          if (data && data.success) {
            setCodeSettings(data.codeSettings);
          }
        } catch (refreshError) {
          console.error("Error after token refresh:", refreshError);
          toast.showError("Failed to load code settings");
        }
      } else {
        console.error("Error fetching code settings:", error);
        toast.showError("Failed to load code settings");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodeSettings();
  }, [event._id]);

  const handleDelete = () => {
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await axiosInstance.delete(`/events/${event._id}`);

      if (response.data.success) {
        toast.showSuccess("Event deleted successfully");
        onClose(true); // Pass true to indicate successful deletion
      }
    } catch (error) {
      toast.showError("Failed to delete event");
      console.error("Error deleting event:", error);
    }
    setShowConfirmDialog(false);
  };

  return (
    <div className="event-settings">
      <div className="settings-header">
        <h2>Event Settings</h2>
        <button className="close-button" onClick={onClose}>
          <RiCloseLine />
        </button>
      </div>

      <div className="settings-content">
        {isLoading ? (
          <div className="settings-group">
            <h3>Code Access</h3>
            <div className="settings-items">
              <div className="loading-message">Loading code settings...</div>
            </div>
          </div>
        ) : (
          <EventCodeSettings
            event={event}
            codeSettings={codeSettings}
            setCodeSettings={setCodeSettings}
          />
        )}

        <div className="settings-group danger-zone">
          <h3>Danger Zone</h3>
          <div className="settings-items">
            <div className="settings-item danger">
              <div
                className="item-icon"
                style={{
                  backgroundColor: "rgba(244, 67, 54, 0.15)",
                  color: "#F44336",
                }}
              >
                <RiInformationLine />
              </div>

              <div className="item-content">
                <h4>Delete Event</h4>
                <p>Once you delete an event, there is no going back.</p>
              </div>

              <div className="item-actions">
                <motion.button
                  className="delete-button"
                  onClick={handleDelete}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Delete Event"
                >
                  <RiCloseLine />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Event Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirmDialog(false)}
          isDangerous={true}
        />
      )}
    </div>
  );
};

export default EventSettings;
