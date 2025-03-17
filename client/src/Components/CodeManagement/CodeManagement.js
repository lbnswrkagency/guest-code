// CodeManagement.js
import React, { useState, useEffect } from "react";
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

  // Render the list of codes
  const renderCodes = () => {
    if ((isLoading && !localCodes.length) || parentLoading) {
      return <div className="loading">Loading codes...</div>;
    }

    if (localCodes.length === 0) {
      return <div className="no-codes">No codes available for this type.</div>;
    }

    return (
      <>
        {localCodes.slice(0, visibleCodes).map((code) => {
          const codeId = code._id || code.id;
          const isEditing =
            editingCode &&
            (editingCode._id === codeId || editingCode.id === codeId);
          const primaryColor = selectedEvent?.primaryColor;
          const codeColor = getCodeColor(code);
          const codeTypeClass = getCodeTypeClass(code);

          // Custom styling for the code icon
          const iconStyle = {
            background: codeColor
              ? `linear-gradient(45deg, ${codeColor}, ${adjustColor(
                  codeColor,
                  20
                )})`
              : undefined,
          };

          return (
            <div
              key={codeId}
              className={`code-management-item ${isEditing ? "editing" : ""}`}
              style={primaryColor ? { borderColor: `${primaryColor}30` } : {}}
            >
              <div className="code-management-item-info">
                <div className={`code-icon ${codeTypeClass}`} style={iconStyle}>
                  {(() => {
                    // Get icon name from code metadata, or from the code itself, or from activeSetting, or fallback to default
                    const iconName =
                      code.metadata?.settingIcon ||
                      code.icon ||
                      activeSetting?.icon ||
                      "RiCodeLine";

                    // Make sure the icon component exists, otherwise use default
                    const IconComponent = iconComponents[iconName]
                      ? iconComponents[iconName]
                      : RiCodeLine;

                    return <IconComponent className="qr-icon" />;
                  })()}
                </div>
                <div className="code-details">
                  {isEditing ? (
                    <input
                      type="text"
                      className="edit-name-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <h3 className="code-name">{code.name}</h3>
                  )}
                  <div className="code-value">{code.code}</div>
                </div>
              </div>

              <div className="code-management-item-people">
                <BsPeopleFill className="people-icon" />
                <span
                  className="people-count"
                  style={primaryColor ? { color: primaryColor } : {}}
                >
                  {code.paxChecked || 0}
                </span>
                <span className="people-separator">/</span>
                {isEditing ? (
                  <select
                    className="edit-pax-select"
                    value={editPax}
                    onChange={(e) => setEditPax(parseInt(e.target.value))}
                  >
                    {/* When editing, consider the code's current maxPax plus remaining quota */}
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
                  <span className="people-max">
                    {code.maxPax || code.pax || 1}
                  </span>
                )}
              </div>

              <div className="code-management-item-actions">
                {isEditing ? (
                  <>
                    <button
                      className="save-edit-btn"
                      onClick={saveEdit}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      className="cancel-edit-btn"
                      onClick={cancelEdit}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="edit-btn"
                      onClick={() => startEdit(code)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="download-btn"
                      onClick={() => downloadCode(code)}
                      title="Download QR"
                    >
                      ⬇️
                    </button>
                    <button
                      className="view-btn"
                      onClick={() => viewCode(code)}
                      title="View QR"
                    >
                      👁️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => confirmDelete(code)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {localCodes.length > visibleCodes && (
          <button
            className="load-more-btn"
            onClick={loadMore}
            style={
              selectedEvent?.primaryColor
                ? {
                    backgroundColor: `${selectedEvent.primaryColor}20`,
                    borderColor: `${selectedEvent.primaryColor}40`,
                  }
                : {}
            }
          >
            Load More Codes
          </button>
        )}
      </>
    );
  };

  return (
    <div className="code-management">
      {renderCodes()}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="code-management-delete">
          <div className="modal-content">
            <button
              className="close-btn"
              onClick={() => setShowDeleteModal(false)}
            >
              ✕
            </button>
            <div className="delete-content">
              <h3>Delete Code</h3>
              <p>
                Are you sure you want to delete the code for{" "}
                <strong>{codeToDelete?.name}</strong>?
              </p>
              <div className="delete-actions">
                <button
                  className="cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="confirm"
                  onClick={deleteCode}
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PNG View Modal - Fullscreen */}
      {showPngModal && (
        <div className="code-png-modal">
          <button className="close-btn" onClick={() => setShowPngModal(false)}>
            ✕
          </button>
          <div className="png-container">
            <img src={pngUrl} alt="Code" />
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeManagement;
