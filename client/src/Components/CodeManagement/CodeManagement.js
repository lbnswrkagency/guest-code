// CodeManagement.js
import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosConfig";
import "./CodeManagement.scss";
import { useToast } from "../Toast/ToastContext";
import moment from "moment";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { BsPeopleFill } from "react-icons/bs";

/**
 * CodeManagement displays and manages the codes that have been generated.
 * It receives codes from CodeGenerator and allows editing, deleting, viewing, and downloading.
 */
function CodeManagement({
  user,
  type,
  setCodes: setCodesParent,
  codes: codesFromParent,
  refreshCounts,
  refreshCodes,
  currentEventDate,
  counts,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  dataInterval,
  selectedEvent,
}) {
  const { showSuccess, showError, showLoading } = useToast();
  const [loading, setLoading] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [codes, setCodes] = useState([]);

  // Stabilize the codes state to prevent flickering
  useEffect(() => {
    if (codesFromParent?.length) {
      console.log(
        `📊 CodeManagement: Received ${codesFromParent.length} codes`
      );

      // Sort codes by createdAt in descending order (newest first)
      const sortedCodes = [...codesFromParent].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setCodes(sortedCodes);
    } else {
      // Reset codes if none are provided
      setCodes([]);
    }
  }, [codesFromParent]);

  // Load more codes
  const loadMore = () => {
    setVisibleCodes((prev) => prev + 10);
  };

  // Reset edit state
  const resetEditState = () => {
    setEditCodeId(null);
    setEditName("");
    setEditPax("");
  };

  // Delete a code
  const confirmDelete = async () => {
    if (!deleteCodeId) return;

    try {
      showLoading("Deleting code...");

      await axiosInstance.delete(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${deleteCodeId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update codes state
      const updatedCodes = codes.filter(
        (code) => code._id !== deleteCodeId && code.id !== deleteCodeId
      );
      setCodes(updatedCodes);

      // Update the parent component
      if (setCodesParent) {
        setCodesParent(updatedCodes);
      }

      // Refresh counts and codes if provided
      if (refreshCounts) {
        try {
          await refreshCounts();
        } catch (error) {
          console.error("Error refreshing counts:", error);
        }
      }

      if (refreshCodes) {
        try {
          await refreshCodes();
        } catch (error) {
          console.error("Error refreshing codes:", error);
        }
      }

      showSuccess("Code deleted successfully");
    } catch (error) {
      console.error("Error deleting code:", error);
      showError(
        error.response?.data?.message ||
          "Failed to delete code. Please try again."
      );
    } finally {
      setShowConfirmDelete(false);
      setDeleteCodeId(null);
    }
  };

  // Handle delete click
  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

  // Start editing a code
  const startEdit = (code) => {
    setEditCodeId(code._id || code.id);
    setEditName(code.name || "");
    setEditPax(code.maxPax || code.pax || 1);
  };

  // Handle edit submission
  const handleEdit = async () => {
    if (!editCodeId) return;

    try {
      showLoading("Updating code...");

      const updateData = {
        name: editName,
        maxPax: parseInt(editPax),
      };

      const response = await axiosInstance.put(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${editCodeId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        // Update codes with the new data
        const updatedCodes = codes.map((code) => {
          const codeId = code._id || code.id;
          return codeId === editCodeId ? { ...code, ...updateData } : code;
        });

        setCodes(updatedCodes);

        // Update the parent component
        if (setCodesParent) {
          setCodesParent(updatedCodes);
        }
      }

      // Refresh counts if provided
      if (refreshCounts) {
        try {
          await refreshCounts();
        } catch (error) {
          console.error("Error refreshing counts:", error);
        }
      }

      resetEditState();
      showSuccess("Code updated successfully");
    } catch (error) {
      console.error("Error updating code:", error);
      showError(
        error.response?.data?.message ||
          "Failed to update code. Please try again."
      );
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    resetEditState();
  };

  // Handle code click to view QR code
  const handleCodeClick = async (codeId) => {
    try {
      setLoading(true);

      // Use the view endpoint to get the PDF for viewing in browser
      const viewUrl = `${process.env.REACT_APP_API_BASE_URL}/codes-creation/${codeId}/view`;

      // Use axiosInstance to get the PDF with proper authentication
      const response = await axiosInstance.get(viewUrl, {
        responseType: "blob",
      });

      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Open the PDF in a new tab
      window.open(url, "_blank");

      setLoading(false);
    } catch (error) {
      console.error("Error viewing code:", error);
      showError("Failed to view code");
      setLoading(false);
    }
  };

  // Handle code download
  const handleDownload = async (codeId) => {
    try {
      setLoading(true);

      // Create a link to download the PDF
      const downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/codes-creation/${codeId}/pdf`;

      // Use axiosInstance to get the PDF with proper authentication
      const response = await axiosInstance.get(downloadUrl, {
        responseType: "blob",
      });

      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `code-${codeId}.pdf`);

      // Append to the document, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      setLoading(false);
    } catch (error) {
      console.error("Error downloading code:", error);
      showError("Failed to download code");
      setLoading(false);
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

    // Return black for bright colors, white for dark colors
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  // Helper to get code color based on type
  const getCodeColor = (code) => {
    // First try to get color from code or codeSettings
    if (code.color) return code.color;
    if (code.codeSettings?.color) return code.codeSettings.color;

    // If code type matches specific types, use predefined colors
    const codeType = code.type || type;
    if (codeType === "Bottle Code") return "#e3a31d"; // Gold
    if (codeType === "Special Code") return "#b92b27"; // Red
    if (codeType === "Table Code") return "#7b1fa2"; // Purple
    if (codeType === "Friends Code") return "#1976d2"; // Blue
    if (codeType === "Backstage Code") return "#0d47a1"; // Dark Blue

    // Default to event's primary color
    return selectedEvent?.primaryColor || "#1976d2";
  };

  // Render codes
  const renderCodes = () => {
    if (!selectedEvent) {
      return (
        <div className="no-codes">
          No event selected. Please select an event in the header.
        </div>
      );
    }

    if (loading && !codes.length) {
      return <div className="loading">Loading codes...</div>;
    }

    if (!codes?.length) {
      return <div className="no-codes">No codes found for this event.</div>;
    }

    return (
      <>
        {codes.slice(0, visibleCodes).map((code) => {
          // Get code ID (handle different formats)
          const codeId = code._id || code.id;
          const isEditing = editCodeId === codeId;
          const primaryColor = selectedEvent?.primaryColor;

          // Get color for this code
          const codeColor = getCodeColor(code);
          const customStyle = codeColor
            ? {
                background: codeColor,
                color: getContrastColor(codeColor),
              }
            : {};

          return (
            <div
              key={codeId}
              className={`code-management-item ${isEditing ? "editing" : ""}`}
              style={primaryColor ? { borderColor: `${primaryColor}30` } : {}}
            >
              <div className="code-management-item-info">
                <div className="code-icon" style={customStyle}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="qr-icon"
                  >
                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 11h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm0 4h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v2h-3v-2z" />
                  </svg>
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
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
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
                      onClick={handleEdit}
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
                      onClick={() => handleDownload(codeId)}
                      title="Download QR"
                    >
                      ⬇️
                    </button>
                    <button
                      className="view-btn"
                      onClick={() => handleCodeClick(codeId)}
                      title="View QR"
                    >
                      👁️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(codeId)}
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

        {codes.length > visibleCodes && (
          <button
            className="load-more-btn"
            onClick={loadMore}
            style={
              selectedEvent?.primaryColor
                ? {
                    backgroundColor: selectedEvent.primaryColor,
                    color: "#fff",
                  }
                : {}
            }
          >
            Load More Codes
          </button>
        )}

        {showConfirmDelete && (
          <ConfirmDialog
            title="Delete Code"
            message="Are you sure you want to delete this code? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDelete}
            onCancel={() => setShowConfirmDelete(false)}
            type="danger"
          />
        )}
      </>
    );
  };

  return <div className="code-management">{renderCodes()}</div>;
}

export default CodeManagement;
