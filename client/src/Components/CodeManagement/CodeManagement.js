// CodeManagement.js
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../utils/axiosConfig";
import "./CodeManagement.scss";
import { useToast } from "../Toast/ToastContext";
import moment from "moment";
import TableLayout from "../TableLayout/TableLayout";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import { FaEye, FaEdit, FaTrash, FaDownload } from "react-icons/fa";
import { BsPeopleFill } from "react-icons/bs";

function CodeManagement({
  user,
  type,
  setCodes: setCodesParent,
  codes: codesFromParent,
  refreshCounts,
  refreshCodes,
  counts,
  selectedEvent,
}) {
  const { showSuccess, showError, showLoading } = useToast();
  const [loading, setLoading] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [showCodeView, setShowCodeView] = useState(false);
  const [codeViewUrl, setCodeViewUrl] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [totalPaxUsed, setTotalPaxUsed] = useState(0);
  const [codes, setCodes] = useState([]);
  const [stableCodesRef] = useState({ current: [] });
  const [currentCodeId, setCurrentCodeId] = useState(null);

  // Calculate total pax
  const calculateTotalPax = useCallback(
    (codesArray = codes) => {
      if (!codesArray?.length) return 0;
      return codesArray.reduce((total, code) => total + (code.maxPax || 1), 0);
    },
    [codes]
  );

  // Update codes when codesFromParent changes
  useEffect(() => {
    if (codesFromParent?.length) {
      console.log(
        `📊 CodeManagement: Received ${codesFromParent.length} codes for ${type}`
      );
      setCodes(codesFromParent);
      stableCodesRef.current = codesFromParent;
      setTotalPaxUsed(calculateTotalPax(codesFromParent));
    } else {
      // Reset codes if none are provided
      setCodes([]);
      stableCodesRef.current = [];
      setTotalPaxUsed(0);
    }
  }, [codesFromParent, calculateTotalPax, type]);

  // Load more codes
  const loadMore = () => {
    setVisibleCodes((prev) => prev + 10);
  };

  // Reset edit state
  const resetEditState = () => {
    setEditCodeId(null);
    setEditName("");
    setEditPax("");
    setEditTableNumber("");
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

      // Update both the state and the stable reference
      const updatedCodes = codes.filter((code) => code._id !== deleteCodeId);
      setCodes(updatedCodes);
      stableCodesRef.current = updatedCodes;

      // Update the parent component if setCodes is provided
      if (setCodesParent) {
        setCodesParent(updatedCodes);
      }

      // Refresh counts and codes if needed
      if (refreshCounts) await refreshCounts();
      if (refreshCodes) await refreshCodes();

      showSuccess("Code deleted successfully");
    } catch (error) {
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
    setEditCodeId(code._id);
    setEditName(code.name || "");
    setEditPax(code.maxPax || 1);
    if (code.tableNumber) {
      setEditTableNumber(code.tableNumber);
    }
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

      if (type === "Table Code" && editTableNumber) {
        updateData.tableNumber = editTableNumber;
      }

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
        const updatedCodes = codes.map((code) =>
          code._id === editCodeId ? { ...code, ...updateData } : code
        );

        setCodes(updatedCodes);
        stableCodesRef.current = updatedCodes;

        if (setCodesParent) {
          setCodesParent(updatedCodes);
        }
      }

      if (refreshCounts) {
        await refreshCounts();
      }

      resetEditState();
      showSuccess("Code updated successfully");
    } catch (error) {
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
      setCurrentCodeId(codeId);

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

  // Close code view
  const closeCodeView = () => {
    setShowCodeView(false);
    setCurrentCodeId(null);
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

  // Format the creation date
  const formatCreationDate = (dateString) => {
    return moment(dateString).format("MMM D, YYYY • h:mm A");
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

  // Add comprehensive console log to display important information about codes
  useEffect(() => {
    if (codes && codes.length > 0) {
      // Group codes by status
      const activeCount = codes.filter((code) => code.active).length;
      const inactiveCount = codes.filter((code) => !code.active).length;

      // Group codes by usage
      const usedCount = codes.filter((code) => code.usageCount > 0).length;
      const unusedCount = codes.filter((code) => code.usageCount === 0).length;

      // Calculate total people admitted with these codes
      const totalPeopleAdmitted = codes.reduce(
        (total, code) => total + code.usageCount * code.maxPax,
        0
      );

      // Group by maxPax
      const codesByMaxPax = {};
      codes.forEach((code) => {
        codesByMaxPax[code.maxPax] = (codesByMaxPax[code.maxPax] || 0) + 1;
      });

      console.log("📊 CODE MANAGEMENT DATA SUMMARY", {
        codeType: type,
        selectedEvent: selectedEvent
          ? {
              id: selectedEvent._id,
              name: selectedEvent.name,
              date: selectedEvent.date,
            }
          : "No event selected",
        codeStats: {
          total: codes.length,
          active: activeCount,
          inactive: inactiveCount,
          used: usedCount,
          unused: unusedCount,
          totalPeopleAdmitted,
        },
        codeDistribution: {
          byMaxPax: codesByMaxPax,
        },
        paginationInfo: {
          visibleCodes,
          totalCodes: codes.length,
          hasMoreToShow: visibleCodes < codes.length,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }, [codes, type, selectedEvent, visibleCodes]);

  // Render codes
  const renderCodes = () => {
    // Use the stable reference to codes if available
    const codesToRender =
      stableCodesRef.current.length > 0 ? stableCodesRef.current : codes;

    if (!selectedEvent) {
      return (
        <div className="no-codes">
          No event selected. Please select an event in the header.
        </div>
      );
    }

    // Show loading only if we have no codes yet
    if (loading && !codesToRender.length) {
      return <div className="loading">Loading codes...</div>;
    }

    if (!codesToRender?.length) {
      return (
        <div className="no-codes">
          No {type?.toLowerCase()} codes found for this event.
        </div>
      );
    }

    // Notify parent of code count if setCodesParent is provided
    if (setCodesParent && codesToRender.length > 0) {
      setTimeout(() => setCodesParent(codesToRender), 0);
    }

    return (
      <>
        {codesToRender.slice(0, visibleCodes).map((code) => {
          // Determine code type class for styling
          let codeTypeClass = "";
          if (type === "Bottle Code") codeTypeClass = "bottle";
          else if (type === "Special Code") codeTypeClass = "special";
          else if (type === "Table Code") codeTypeClass = "table";
          else if (type === "Friends Code") codeTypeClass = "friends";
          else if (type === "Backstage Code") codeTypeClass = "backstage";

          // Use code's color if available, or fall back to event's primary color
          const codeColor =
            code.color ||
            code.codeSettings?.color ||
            selectedEvent?.primaryColor;
          const customStyle = codeColor
            ? {
                background: codeColor,
                color: getContrastColor(codeColor),
              }
            : {};

          const isEditing = editCodeId === code._id;
          const primaryColor = selectedEvent?.primaryColor;

          return (
            <div
              key={code._id}
              className={`code-management-item ${isEditing ? "editing" : ""}`}
              style={primaryColor ? { borderColor: `${primaryColor}30` } : {}}
            >
              <div className="code-management-item-info">
                <div
                  className={`code-icon ${codeTypeClass}`}
                  style={customStyle}
                >
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
                <span className="people-icon">👤</span>
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
                  <span className="people-max">{code.maxPax || 1}</span>
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
                      style={primaryColor ? { color: primaryColor } : {}}
                    >
                      ✏️
                    </button>
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(code._id)}
                      title="Download QR"
                    >
                      ⬇️
                    </button>
                    <button
                      className="view-btn"
                      onClick={() => handleCodeClick(code._id)}
                      title="View QR"
                    >
                      👁️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(code._id)}
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

        {codesToRender.length > visibleCodes && (
          <button
            className="load-more-btn"
            onClick={loadMore}
            style={
              selectedEvent?.primaryColor
                ? {
                    backgroundColor: selectedEvent.primaryColor,
                    color: getContrastColor(selectedEvent.primaryColor),
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

  // Render the code view modal - no longer needed as we open in new tab
  const renderCodeView = () => {
    // We're not using the modal anymore, but keeping the function
    // in case we need to revert or modify the approach
    return null;
  };

  return (
    <div className="code-management">
      {renderCodes()}
      {/* renderCodeView is now a no-op */}
      {renderCodeView()}
    </div>
  );
}

export default CodeManagement;
