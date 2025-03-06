// CodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CodeManagement.scss";
import { useToast } from "../Toast/ToastContext";
import moment from "moment";
import TableLayout from "../TableLayout/TableLayout"; // Import if needed for table codes
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";

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
  const [showCodeView, setShowCodeView] = useState(false);
  const [codeViewUrl, setCodeViewUrl] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [currentEditingCodePax, setCurrentEditingCodePax] = useState(0);
  const [totalPaxUsed, setTotalPaxUsed] = useState(0);
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    if (codesFromParent && codesFromParent.length > 0) {
      setCodes(codesFromParent);
    }
  }, [codesFromParent]);

  // Fetch codes when component mounts or when dependencies change
  useEffect(() => {
    if (selectedEvent && type) {
      console.log(
        `🔄 MANAGEMENT: Refreshing codes for type=${type}, event=${selectedEvent._id}`
      );
      fetchCodes();
    }
  }, [selectedEvent, type, dataInterval]);

  // Add debugging for props with detailed event info
  useEffect(() => {
    console.group("🔍 MANAGEMENT PROPS");
    console.log("User:", user?._id);
    console.log("Type:", type);
    console.log("Codes Length:", codes?.length);
    console.log(
      "Selected Event:",
      selectedEvent
        ? {
            _id: selectedEvent._id,
            name: selectedEvent.name,
            date: selectedEvent.date,
            user: selectedEvent.user,
            brand: selectedEvent.brand,
            logo: selectedEvent.logo, // Check if logo exists
            // Log the entire object for debugging
            fullObject: selectedEvent,
          }
        : "undefined"
    );
    console.log("Data Interval:", dataInterval);

    // Check if codes have color information
    if (codes && codes.length > 0) {
      console.log("Sample Code Data:", {
        id: codes[0]._id,
        name: codes[0].name,
        type: codes[0].type,
        color: codes[0].color, // Check if color exists in code data
        codeSettings: codes[0].codeSettings, // Check if codeSettings exists
        fullObject: codes[0],
      });
    }

    console.groupEnd();
  }, [user, type, codes, selectedEvent, dataInterval]);

  // Add debugging for selectedEvent changes
  useEffect(() => {
    console.log(
      `🔍 MANAGEMENT: selectedEvent changed to ${
        selectedEvent ? selectedEvent._id : "undefined"
      }`
    );
    if (selectedEvent && type) {
      console.log(
        `🔄 MANAGEMENT: Refreshing codes for event=${selectedEvent._id}, type=${type}`
      );
      fetchCodes();
    }
  }, [selectedEvent, type]);

  // Add a warning if selectedEvent is undefined
  useEffect(() => {
    if (!selectedEvent) {
      console.warn(
        "⚠️ MANAGEMENT: No event selected. Please select an event in the header."
      );
    }
  }, [selectedEvent]);

  const fetchCodes = async () => {
    if (!selectedEvent || !type) {
      console.warn(
        "⚠️ MANAGEMENT: Cannot fetch codes without selectedEvent and type"
      );
      return;
    }

    try {
      setLoading(true);
      console.log(
        `🔄 MANAGEMENT: Fetching codes for event=${selectedEvent._id}, type=${type}`
      );
      console.log("Event data:", {
        id: selectedEvent._id,
        name: selectedEvent.name,
        logo: selectedEvent.logo,
        brand: selectedEvent.brand,
      });

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/events/${selectedEvent._id}/${type}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log(`✅ MANAGEMENT: Fetched ${response.data.codes.length} codes`);

      // Log the first code to check for color and settings
      if (response.data.codes.length > 0) {
        const sampleCode = response.data.codes[0];
        console.log("Sample code data:", {
          id: sampleCode._id,
          name: sampleCode.name,
          type: sampleCode.type,
          color: sampleCode.color,
          codeSettings: sampleCode.codeSettings,
          eventId: sampleCode.eventId,
          paxChecked: sampleCode.paxChecked,
          maxPax: sampleCode.maxPax,
        });
      }

      setCodes(response.data.codes);
      setTotalPaxUsed(calculateTotalPax());
      setLoading(false);
    } catch (error) {
      console.error("❌ MANAGEMENT: Error fetching codes:", error);

      // Show a more specific error message if available
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        console.error("Error message:", error.response.data.message);
      }

      setLoading(false);
      setCodes([]);
    }
  };

  const calculateTotalPax = () => {
    if (!codes || codes.length === 0) return 0;
    return codes.reduce((total, code) => total + (code.maxPax || 1), 0);
  };

  const loadMore = () => {
    setVisibleCodes((prev) => prev + 10);
  };

  const confirmDelete = async () => {
    if (!deleteCodeId) return;

    try {
      showLoading("Deleting code...");

      console.log(`🔍 CLIENT: Attempting to delete code: ${deleteCodeId}`);

      // Use the API endpoint for deleting codes
      const response = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${deleteCodeId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("✅ CLIENT: Delete response:", response.data);

      // Refresh codes instead of manually updating state
      await refreshCodes();

      // Refresh counts
      if (refreshCounts) {
        await refreshCounts();
      }

      showSuccess("Code deleted successfully");
      setShowConfirmDelete(false);
      setDeleteCodeId(null);
    } catch (error) {
      console.error("❌ CLIENT: Error deleting code:", error);

      // Show a more specific error message if available
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        showError(error.response.data.message);
      } else {
        showError("Failed to delete code. Please try again.");
      }

      setShowConfirmDelete(false);
      setDeleteCodeId(null);
    }
  };

  const getMaxAllowedPax = () => {
    // Find the maximum allowed pax for this code type
    if (type === "Table") {
      return 20; // Default max for tables
    }

    // For other code types, check if there's a limit in the code settings
    const relevantCode = codes.find(
      (code) => code.type.toLowerCase() === type.toLowerCase()
    );
    if (relevantCode && relevantCode.setting && relevantCode.setting.maxPax) {
      return relevantCode.setting.maxPax;
    }

    return 10; // Default fallback
  };

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name || "");

    // Use maxPax for editing, not paxChecked
    setEditPax(code.maxPax || 1);

    // Store the current maxPax value
    setCurrentEditingCodePax(code.maxPax || 1);

    if (code.tableNumber) {
      setEditTableNumber(code.tableNumber);
    }
  };

  const handleEdit = async () => {
    if (!editCodeId) return;

    try {
      showLoading("Updating code...");

      const updateData = {
        name: editName,
        maxPax: parseInt(editPax), // Update maxPax instead of paxChecked
      };

      if (type === "Table Code" && editTableNumber) {
        updateData.tableNumber = editTableNumber;
      }

      console.log(
        `🔍 CLIENT: Attempting to update code: ${editCodeId}`,
        updateData
      );

      // Use the API endpoint for updating codes
      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${editCodeId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("✅ CLIENT: Update response:", response.data);

      // Refresh codes instead of manually updating state
      await refreshCodes();

      // Reset edit state
      setEditCodeId(null);
      setEditName("");
      setEditPax("");
      setEditTableNumber("");
      setCurrentEditingCodePax(0);

      showSuccess("Code updated successfully");
    } catch (error) {
      console.error("❌ CLIENT: Error updating code:", error);

      // Show a more specific error message if available
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        showError(error.response.data.message);
      } else {
        showError("Failed to update code. Please try again.");
      }

      // Don't reset edit state on error so user can try again
    }
  };

  const cancelEdit = () => {
    setEditCodeId(null);
    setEditName("");
    setEditPax("");
    setEditTableNumber("");
    setCurrentEditingCodePax(0);
  };

  const handleCodeClick = async (codeId) => {
    try {
      // Use the new API endpoint for generating code images
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${codeId}/image`,
        {
          responseType: "text",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setCodeViewUrl(response.data);
      setShowCodeView(true);
    } catch (error) {
      console.error("Error fetching code image:", error);
      showError("Failed to load code image");
    }
  };

  const closeCodeView = () => setShowCodeView(false);

  const handleDownload = async (codeId) => {
    try {
      showLoading("Preparing download...");

      // Use the new API endpoint for generating code images
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/${codeId}/image`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Find the code object
      const code = codes.find((c) => c._id === codeId);

      // Create a filename based on the code's name and type
      let filename = `${code.name}-${type}Code.png`;

      // Sanitize filename
      filename = filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();

      // Use response.data directly as it's already a Blob
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showSuccess("Code downloaded successfully.");
    } catch (error) {
      console.error("Error downloading code:", error);
      showError("Failed to download the code.");
    }
  };

  // Format the creation date
  const formatCreationDate = (dateString) => {
    return moment(dateString).format("MMM D, YYYY • h:mm A");
  };

  // Render function with debugging
  const renderCodes = () => {
    console.log("🔍 MANAGEMENT RENDER:", {
      codes: codes?.length,
      visibleCodes,
      loading,
      type,
      selectedEvent: selectedEvent?._id,
    });

    if (!selectedEvent) {
      return (
        <div className="no-codes">
          No event selected. Please select an event in the header.
        </div>
      );
    }

    if (loading) {
      return <div className="loading">Loading codes...</div>;
    }

    if (!codes || codes.length === 0) {
      console.log("❌ MANAGEMENT: No codes found for type:", type);
      return (
        <div className="no-codes">
          No {type?.toLowerCase()} codes found for this event.
        </div>
      );
    }

    console.log(
      `✅ MANAGEMENT RENDER: Displaying ${Math.min(
        visibleCodes,
        codes.length
      )} of ${codes.length} codes`
    );

    return (
      <>
        {codes.slice(0, visibleCodes).map((code) => {
          // Get first letter of name for icon
          const firstLetter = code.name
            ? code.name.charAt(0).toUpperCase()
            : "C";

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

          return (
            <div
              key={code._id}
              className={`code-management-item ${isEditing ? "editing" : ""}`}
              style={
                selectedEvent?.primaryColor
                  ? {
                      borderColor: `${selectedEvent.primaryColor}30`, // 30 adds 19% opacity
                    }
                  : {}
              }
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
                  style={
                    selectedEvent?.primaryColor
                      ? {
                          color: selectedEvent.primaryColor,
                        }
                      : {}
                  }
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
                      style={
                        selectedEvent?.primaryColor
                          ? {
                              color: selectedEvent.primaryColor,
                            }
                          : {}
                      }
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

        {codes.length > visibleCodes && (
          <button
            className="load-more-btn"
            onClick={() => setVisibleCodes(visibleCodes + 10)}
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

        {/* Use ConfirmDialog for delete confirmation */}
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

  // Helper function to determine text color based on background color
  const getContrastColor = (hexColor) => {
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

  // Render the code view modal
  const renderCodeView = () => {
    if (!showCodeView) return null;

    return (
      <div className="code-management-view">
        <div className="modal-content">
          <button className="close-btn" onClick={() => setShowCodeView(false)}>
            ×
          </button>
          <img src={codeViewUrl} alt="QR Code" />
        </div>
      </div>
    );
  };

  return (
    <div className="code-management">
      {renderCodes()}
      {renderCodeView()}
    </div>
  );
}

export default CodeManagement;
