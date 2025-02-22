import React, { useState } from "react";
import { motion } from "framer-motion";
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
} from "react-icons/ri";
import "./EventSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";

const EventSettings = ({ event, onClose }) => {
  const toast = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [settings, setSettings] = useState({
    guestCode: event?.guestCode || false,
    friendsCode: event?.friendsCode || false,
    ticketCode: event?.ticketCode || false,
    tableCode: event?.tableCode || false,
    isPublic: event?.isPublic || true,
  });

  const handleSettingChange = async (key, value) => {
    try {
      const response = await axiosInstance.put(
        `/events/${event._id}/settings`,
        {
          [key]: value,
        }
      );

      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));

      toast.showSuccess("Settings updated successfully");
    } catch (error) {
      toast.showError("Failed to update settings");
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
              className="settings-item"
              onClick={() =>
                handleSettingChange("isPublic", !settings.isPublic)
              }
            >
              <div className="item-icon">
                <RiEyeLine />
              </div>
              <div className="item-content">
                <h4>Public Event</h4>
                <p>
                  {settings.isPublic
                    ? "Event is visible to everyone"
                    : "Event is private"}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Access Control</h3>
          <div className="settings-items">
            <button
              className="settings-item"
              onClick={() =>
                handleSettingChange("guestCode", !settings.guestCode)
              }
            >
              <div className="item-icon">
                <RiGroupLine />
              </div>
              <div className="item-content">
                <h4>Guest Code</h4>
                <p>
                  {settings.guestCode
                    ? "Guest codes are enabled"
                    : "Guest codes are disabled"}
                </p>
              </div>
            </button>

            <button
              className="settings-item"
              onClick={() =>
                handleSettingChange("friendsCode", !settings.friendsCode)
              }
            >
              <div className="item-icon">
                <RiTeamLine />
              </div>
              <div className="item-content">
                <h4>Friends Code</h4>
                <p>
                  {settings.friendsCode
                    ? "Friends codes are enabled"
                    : "Friends codes are disabled"}
                </p>
              </div>
            </button>

            <button
              className="settings-item"
              onClick={() =>
                handleSettingChange("ticketCode", !settings.ticketCode)
              }
            >
              <div className="item-icon">
                <RiTicketLine />
              </div>
              <div className="item-content">
                <h4>Ticket Code</h4>
                <p>
                  {settings.ticketCode
                    ? "Ticket codes are enabled"
                    : "Ticket codes are disabled"}
                </p>
              </div>
            </button>

            <button
              className="settings-item"
              onClick={() =>
                handleSettingChange("tableCode", !settings.tableCode)
              }
            >
              <div className="item-icon">
                <RiVipLine />
              </div>
              <div className="item-content">
                <h4>Table Code</h4>
                <p>
                  {settings.tableCode
                    ? "Table codes are enabled"
                    : "Table codes are disabled"}
                </p>
              </div>
            </button>
          </div>
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
    </div>
  );
};

export default EventSettings;
