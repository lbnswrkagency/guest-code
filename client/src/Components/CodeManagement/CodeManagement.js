// CodeManagement.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "./CodeManagement.scss";
import { useToast } from "../Toast/ToastContext";
import { BsPeopleFill } from "react-icons/bs";
import {
  RiCodeLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiGridLine,
  RiStarLine,
  RiFireLine,
  RiHeartLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
  RiMailLine,
  RiEditLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiDownloadLine,
  RiCheckLine,
  RiCloseLine,
} from "react-icons/ri";

// Map icon names to React components
const iconComponents = {
  RiCodeLine: RiCodeLine,
  RiTicketLine: RiTicketLine,
  RiUserLine: RiUserLine,
  RiVipLine: RiVipLine,
  RiTableLine: RiTableLine,
  RiGridLine: RiGridLine,
  RiStarLine: RiStarLine,
  RiFireLine: RiFireLine,
  RiHeartLine: RiHeartLine,
  RiThumbUpLine: RiThumbUpLine,
  RiCupLine: RiCupLine,
  RiGift2Line: RiGift2Line,
  RiMedalLine: RiMedalLine,
  RiTrophyLine: RiTrophyLine,
  RiMailLine: RiMailLine,
};

// Helper function to adjust a color's brightness
const adjustColor = (color, amount) => {
  // Remove # if present
  color = color.replace("#", "");

  // Parse the color into RGB components
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust each component
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG
    .toString(16)
    .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
};

/**
 * CodeManagement displays and manages the codes that have been generated.
 * It receives codes from CodeGenerator and allows editing, deleting, viewing, and downloading.
 */
function CodeManagement({
  user,
  type,
  codes = [],
  setCodes = null,
  refreshCodes = null,
  refreshCounts = null,
  selectedEvent,
  isLoading: parentLoading = false,
  activeSetting = null,
  maxPeopleOptions = [],
  maxPeopleAllowed = 5,
  remainingQuota = Infinity,
  hasLimitReached = false,
}) {
  const { showSuccess, showError, showLoading } = useToast();
  const [localCodes, setLocalCodes] = useState([]);
  const [editingCode, setEditingCode] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingCode, setViewingCode] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [showPngModal, setShowPngModal] = useState(false);
  const [pngUrl, setPngUrl] = useState("");

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingCode, setEmailingCode] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Update local codes when parent codes change
  useEffect(() => {
    if (codes && codes.length > 0) {
      // Sort codes by creation date (newest first)
      const sortedCodes = [...codes].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setLocalCodes(sortedCodes);
    } else {
      setLocalCodes([]);
    }
  }, [codes]);

  // Load more codes
  const loadMore = () => {
    setVisibleCodes((prev) => prev + 10);
  };

  // Confirm code deletion
  const confirmDelete = (code) => {
    setCodeToDelete(code);
    setShowDeleteModal(true);
  };

  // Delete a code
  const deleteCode = async () => {
    if (!codeToDelete) return;

    setIsLoading(true);
    showLoading("Deleting code...");

    try {
      const codeId = codeToDelete._id || codeToDelete.id;

      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${codeId}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Remove the deleted code from the local state
      const updatedCodes = localCodes.filter(
        (c) => c._id !== codeId && c.id !== codeId
      );

      setLocalCodes(updatedCodes);

      // Update parent component state if setCodes is provided
      if (setCodes) {
        setCodes(updatedCodes);
      }

      // Refresh counts and codes if provided
      if (refreshCounts) refreshCounts();
      if (refreshCodes) refreshCodes();

      showSuccess("Code deleted successfully");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete code");
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setCodeToDelete(null);
    }
  };

  // Start editing a code
  const startEdit = (code) => {
    setEditingCode(code);
    setEditName(code.name || "");
    setEditPax(code.maxPax || code.pax || 1);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCode(null);
  };

  // Save edited code
  const saveEdit = async () => {
    if (!editingCode) return;

    setIsLoading(true);
    showLoading("Updating code...");

    try {
      const codeId = editingCode._id || editingCode.id;

      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${codeId}`,
        {
          name: editName,
          maxPax: parseInt(editPax),
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update the edited code in the local state
      const updatedCodes = localCodes.map((c) => {
        if (c._id === codeId || c.id === codeId) {
          return {
            ...c,
            name: editName,
            maxPax: parseInt(editPax),
          };
        }
        return c;
      });

      setLocalCodes(updatedCodes);

      // Update parent component state if setCodes is provided
      if (setCodes) {
        setCodes(updatedCodes);
      }

      // Refresh counts and codes to update remaining values in the parent
      if (refreshCounts) refreshCounts();
      if (refreshCodes) refreshCodes();

      showSuccess("Code updated successfully");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to update code");
    } finally {
      setIsLoading(false);
      setEditingCode(null);
    }
  };

  // View code details
  const viewCode = async (code) => {
    try {
      setIsLoading(true);
      const loadingToast = showLoading("Preparing your ticket...");

      const codeId = code._id || code.id;

      // Use the PNG endpoint with authentication
      const pngUrl = `${process.env.REACT_APP_API_BASE_URL}/codes-creation/${codeId}/png`;

      // Fetch the PNG with proper authentication
      const response = await axios.get(pngUrl, {
        responseType: "blob",
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Convert blob to data URL
      const reader = new FileReader();
      reader.readAsDataURL(response.data);
      reader.onloadend = () => {
        const base64data = reader.result;
        setPngUrl(base64data);
        setShowPngModal(true);
        loadingToast.dismiss();
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Error viewing code:", error);
      showError("Failed to view code");
      setIsLoading(false);
    }
  };

  // Download code PDF
  const downloadCode = async (code) => {
    try {
      setIsLoading(true);
      showLoading("Downloading code...");

      const codeId = code._id || code.id;

      // Create a link to download the PDF
      const downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/codes-creation/${codeId}/pdf`;

      // Use axios to get the PDF with proper authentication
      const response = await axios.get(downloadUrl, {
        responseType: "blob",
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `code-${code.name}.pdf`);

      // Append to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      showSuccess("Code downloaded successfully");
    } catch (error) {
      console.error("Error downloading code:", error);
      showError("Failed to download code");
    } finally {
      setIsLoading(false);
    }
  };

  // Download code PNG
  const downloadCodePNG = async (code) => {
    try {
      setIsLoading(true);
      showLoading("Downloading code as PNG...");

      const codeId = code._id || code.id;

      // Create a link to download the PNG
      const downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/codes-creation/${codeId}/png-download`;

      // Use axios to get the PNG with proper authentication
      const response = await axios.get(downloadUrl, {
        responseType: "blob",
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `code-${code.name}.png`);

      // Append to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      showSuccess("PNG downloaded successfully");
    } catch (error) {
      console.error("Error downloading PNG:", error);
      showError("Failed to download PNG");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine text color based on background color
  const getContrastColor = (hexColor) => {
    if (!hexColor) return "#FFFFFF";

    // Remove the # if it exists
    hexColor = hexColor.replace("#", "");

    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  // Get code color based on type
  const getCodeColor = (code) => {
    // First try to get color directly from code
    if (code.color) return code.color;

    // If it's from metadata
    if (code.metadata?.settingColor) return code.metadata.settingColor;

    // If code type matches specific types, use predefined colors
    const codeType = code.type?.toLowerCase() || "";
    if (codeType.includes("bottle")) return "#e3a31d"; // Gold
    if (codeType.includes("special")) return "#b92b27"; // Red
    if (codeType.includes("table")) return "#7b1fa2"; // Purple
    if (codeType.includes("friends")) return "#1976d2"; // Blue
    if (codeType.includes("backstage")) return "#0d47a1"; // Dark Blue

    // Default to event's primary color
    return selectedEvent?.primaryColor || "#1976d2";
  };

  // Get code type class
  const getCodeTypeClass = (code) => {
    const codeType = code.type?.toLowerCase() || "";
    if (codeType.includes("bottle")) return "bottle";
    if (codeType.includes("special")) return "special";
    if (codeType.includes("table")) return "table";
    if (codeType.includes("friends")) return "friends";
    if (codeType.includes("backstage")) return "backstage";
    return "";
  };

  // Calculate max allowed value for editing a specific code
  const getMaxEditValue = (code) => {
    // Start with the setting's max allowed or a default of 5
    const settingMax = activeSetting?.maxPax || 5;

    // If unlimited, just use the setting max
    if (remainingQuota === Infinity) {
      return settingMax;
    }

    // Current code's maxPax
    const currentMax = code.maxPax || 1;

    // For editing, we can use the current value plus any remaining quota
    // This allows a code to keep its current value plus use any available quota
    const availableForThisCode = currentMax + remainingQuota;

    // Don't exceed the setting's maximum and ensure at least 1
    return Math.max(1, Math.min(availableForThisCode, settingMax));
  };

  // Send code by email
  const sendCodeByEmail = async () => {
    if (!emailingCode || !recipientEmail) return;

    try {
      setSendingEmail(true);
      showLoading("Sending code by email...");

      const codeId = emailingCode._id || emailingCode.id;

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${codeId}/email`,
        {
          recipientName: emailingCode.name || "Guest", // Use the code's name
          recipientEmail,
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showSuccess("Code sent by email successfully");

      // Reset form
      setRecipientEmail("");
      setShowEmailModal(false);
      setEmailingCode(null);
    } catch (error) {
      showError(
        error.response?.data?.message || "Failed to send code by email"
      );
    } finally {
      setSendingEmail(false);
    }
  };

  // Start email process
  const openEmailForm = (code) => {
    setEmailingCode(code);
    setRecipientEmail("");
    setShowEmailModal(true);
  };

  // Close email form
  const closeEmailForm = () => {
    setShowEmailModal(false);
    setEmailingCode(null);
    setRecipientEmail("");
  };

  // Render the list of codes with new card-based layout
  const renderCodes = () => {
    if ((isLoading && !localCodes.length) || parentLoading) {
      return <div className="loading">Loading codes...</div>;
    }

    if (localCodes.length === 0) {
      return (
        <div className="no-codes">
          <RiCodeLine className="no-codes-icon" />
          <p>No codes generated yet</p>
        </div>
      );
    }

    return (
      <>
        <AnimatePresence mode="popLayout">
          {localCodes.slice(0, visibleCodes).map((code) => {
            const codeId = code._id || code.id;
            const isEditing =
              editingCode &&
              (editingCode._id === codeId || editingCode.id === codeId);
            const codeColor = getCodeColor(code);

            // Get icon component
            const iconName =
              code.metadata?.settingIcon ||
              code.icon ||
              activeSetting?.icon ||
              "RiCodeLine";
            const IconComponent = iconComponents[iconName] || RiCodeLine;

            // Custom styling for the code icon
            const iconStyle = {
              background: codeColor
                ? `linear-gradient(135deg, ${codeColor}, ${adjustColor(
                    codeColor,
                    30
                  )})`
                : "linear-gradient(135deg, #2196f3, #1976d2)",
            };

            return (
              <motion.div
                key={codeId}
                className={`code-card ${isEditing ? "editing" : ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className="card-main">
                  <div className="code-icon" style={iconStyle}>
                    <IconComponent />
                  </div>

                  <div className="code-info">
                    {isEditing ? (
                      <input
                        type="text"
                        className="edit-name-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <h4>{code.name}</h4>
                    )}
                    <div className="code-value">{code.code}</div>
                  </div>

                  <div className="pax-badge">
                    <BsPeopleFill />
                    <span className="pax-checked">{code.paxChecked || 0}</span>
                    <span className="pax-separator">/</span>
                    {isEditing ? (
                      <select
                        className="edit-pax-select"
                        value={editPax}
                        onChange={(e) => setEditPax(parseInt(e.target.value))}
                      >
                        {Array.from(
                          { length: getMaxEditValue(editingCode) },
                          (_, i) => i + 1
                        ).map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="pax-max">
                        {code.maxPax || code.pax || 1}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="action-btn save"
                        onClick={saveEdit}
                        title="Save"
                      >
                        <RiCheckLine />
                      </button>
                      <button
                        className="action-btn cancel"
                        onClick={cancelEdit}
                        title="Cancel"
                      >
                        <RiCloseLine />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                      >
                        <RiEditLine />
                      </button>
                      <button
                        className="action-btn email"
                        onClick={() => openEmailForm(code)}
                        title="Send by Email"
                      >
                        <RiMailLine />
                      </button>
                      <button
                        className="action-btn download"
                        onClick={() => downloadCodePNG(code)}
                        title="Download PNG"
                      >
                        <RiDownloadLine />
                      </button>
                      <button
                        className="action-btn view"
                        onClick={() => viewCode(code)}
                        title="View"
                      >
                        <RiEyeLine />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => confirmDelete(code)}
                        title="Delete"
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {localCodes.length > visibleCodes && (
          <motion.button
            className="load-more-btn"
            onClick={loadMore}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Load More ({localCodes.length - visibleCodes} remaining)
          </motion.button>
        )}
      </>
    );
  };

  return (
    <div className="code-management">
      {renderCodes()}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="delete-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              className="delete-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete Code</h3>
              <p>
                Are you sure you want to delete the code for{" "}
                <strong>{codeToDelete?.name}</strong>?
              </p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="delete-btn"
                  onClick={deleteCode}
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View QR Code Modal (legacy - keeping for compatibility) */}
      <AnimatePresence>
        {showViewModal && (
          <motion.div
            className="png-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowViewModal(false)}
          >
            <button className="close-btn" onClick={() => setShowViewModal(false)}>
              <RiCloseLine />
            </button>
            <div className="png-container" onClick={(e) => e.stopPropagation()}>
              <img src={viewingCode?.qrCode} alt="QR Code" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PNG View Modal - Fullscreen */}
      <AnimatePresence>
        {showPngModal && (
          <motion.div
            className="png-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPngModal(false)}
          >
            <button className="close-btn" onClick={() => setShowPngModal(false)}>
              <RiCloseLine />
            </button>
            <div className="png-container" onClick={(e) => e.stopPropagation()}>
              <img src={pngUrl} alt="Code" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Code Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            className="email-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEmailForm}
          >
            <motion.div
              className="email-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-btn" onClick={closeEmailForm}>
                <RiCloseLine />
              </button>
              <h3>Send Code to {emailingCode?.name}</h3>
              <div className="email-form">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  autoFocus
                />
                <button
                  className="send-btn"
                  onClick={sendCodeByEmail}
                  disabled={sendingEmail || !recipientEmail}
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CodeManagement;
