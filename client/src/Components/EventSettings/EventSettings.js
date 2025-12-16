import React, { useState, useEffect } from "react";
import "./EventSettings.scss";
import { motion } from "framer-motion";
import { RiInformationLine, RiCloseLine, RiCodeLine, RiDeleteBinLine } from "react-icons/ri";
import EventCodeSettings from "../EventCodeSettings/EventCodeSettings";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";

const EventSettings = ({ event, onClose }) => {
  const [activeTab, setActiveTab] = useState("codes");
  const { showToast, showSuccess, showError } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [codeSettings, setCodeSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced token refresh function - MOVED INSIDE the component
  const fetchWithTokenRefresh = async (requestFunc) => {
    try {
      return await requestFunc();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Token expired, attempt to refresh
        try {
          // Refresh token logic would go here
          console.log("Token refresh logic would go here");
          // Retry original request
          return await requestFunc();
        } catch (refreshErr) {
          console.error("Error refreshing token:", refreshErr);
          throw refreshErr;
        }
      }
      throw err;
    }
  };

  useEffect(() => {
    const fetchCodeSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetchWithTokenRefresh(() =>
          axiosInstance.get(`/code-settings/events/${event._id}`)
        );
        setCodeSettings(response.data.codeSettings || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching code settings:", error);
        showToast("Error loading code settings", "error");
        setIsLoading(false);
      }
    };

    fetchCodeSettings();
  }, [event._id]);

  const handleDelete = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await fetchWithTokenRefresh(() =>
        axiosInstance.delete(`/events/${event._id}`)
      );

      // Use correct toast methods from useToast()
      showSuccess("Event deleted successfully");

      // Redirect or update state as needed
      if (onClose) {
        onClose({
          deleted: true,
          eventId: event._id,
        });
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      showError(
        "Failed to delete event: " +
          (error.response?.data?.message || error.message)
      );
    }
    setShowConfirmDialog(false);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };


  return (
    <div className="event-settings">
      <div className="settings-header">
        <h2>Event Settings</h2>
        <motion.button
          className="close-button"
          onClick={() => onClose && onClose()}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RiCloseLine />
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <motion.button
          className={`tab-button ${activeTab === "codes" ? "active" : ""}`}
          onClick={() => setActiveTab("codes")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RiCodeLine />
          Code Settings
        </motion.button>
        <motion.button
          className={`tab-button ${activeTab === "danger" ? "active" : ""}`}
          onClick={() => setActiveTab("danger")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RiDeleteBinLine />
          Danger Zone
        </motion.button>
      </div>

      <div className="settings-content">
        {/* Code Settings Tab */}
        {activeTab === "codes" && (
          <EventCodeSettings
            event={event}
            codeSettings={codeSettings}
            setCodeSettings={setCodeSettings}
            isLoading={isLoading}
          />
        )}


        {/* Danger Zone Tab */}
        {activeTab === "danger" && (
          <div className="danger-zone">
            <div className="section-header">
              <RiDeleteBinLine />
              <h3>Danger Zone</h3>
              <p>Irreversible and destructive actions</p>
            </div>

            <div className="danger-actions">
              <div className="settings-item">
                <div className="item-info">
                  <h4>Delete Event</h4>
                  <p>Permanently delete this event. This action cannot be undone.</p>
                </div>
                <div className="item-actions">
                  <motion.button
                    className="delete-button"
                    onClick={handleDelete}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete Event
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Only render ConfirmDialog when showConfirmDialog is true */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          type="danger"
        />
      )}
    </div>
  );
};

export default EventSettings;
