// TableCodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./TableCodeManagement.scss";

function TableCodeManagement({
  user,
  refreshCounts,
  dataInterval,
  tableCategories,
  refreshTrigger,
  selectedEvent,
  counts = { tableCounts: [] },
}) {
  const toast = useToast();
  const [codes, setCodes] = useState([]);
  const [codesByCategory, setCodesByCategory] = useState({});
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [pngUrl, setPngUrl] = useState("");
  const [showPngModal, setShowPngModal] = useState(false);
  const [tablesBookedCount, setTablesBookedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Add new state for cancel confirmation
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelCodeId, setCancelCodeId] = useState(null);

  const tableColors = {
    djarea: "#ffd700", // Gold for DJ Area tables
    backstage: "#80221c", // Rich red for backstage
    vip: "#1b5e20", // Your new green for VIP
    premium: "#4a90e2", // Blue for premium
  };

  // Define the desired category order
  const categoryOrder = ["djarea", "backstage", "vip", "premium"];

  const getCategoryForTable = (tableNumber) => {
    if (tableNumber.startsWith("B")) {
      return "djarea";
    } else if (tableNumber.startsWith("P") || tableNumber.startsWith("E")) {
      return "backstage";
    } else if (
      tableNumber.startsWith("A") ||
      tableNumber.startsWith("F") ||
      tableNumber.startsWith("R")
    ) {
      return "vip";
    } else if (tableNumber.startsWith("K")) {
      return "premium";
    } else {
      return "unknown";
    }
  };

  useEffect(() => {
    if (selectedEvent && selectedEvent._id) {
      console.log(
        "TableCodeManagement: Fetching codes due to refreshTrigger change:",
        refreshTrigger
      );
      fetchCodes();
    }
  }, [selectedEvent, refreshTrigger, dataInterval]);

  const fetchCodes = async () => {
    if (!selectedEvent || !selectedEvent._id) {
      console.log("No selectedEvent or selectedEvent._id available");
      return;
    }

    if (!dataInterval || !dataInterval.startDate || !dataInterval.endDate) {
      console.log("Data interval not properly initialized yet");
      return;
    }

    setIsLoading(true);
    try {
      console.log(
        "Fetching table codes for event:",
        selectedEvent._id,
        "with date range:",
        dataInterval.startDate.toISOString(),
        "to",
        dataInterval.endDate.toISOString()
      );

      // The server expects startDate and endDate parameters
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/codes`,
        {
          params: {
            eventId: selectedEvent._id,
            startDate: dataInterval.startDate.toISOString(),
            endDate: dataInterval.endDate.toISOString(),
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const fetchedCodes = response.data;
      console.log(`Successfully fetched ${fetchedCodes.length} table codes`);

      // If we have successfully fetched codes from the server
      if (fetchedCodes && Array.isArray(fetchedCodes)) {
        // Sort and group the codes
        const groupedCodes = categoryOrder.reduce((acc, category) => {
          acc[category] = fetchedCodes.filter(
            (code) => getCategoryForTable(code.tableNumber) === category
          );
          return acc;
        }, {});

        setCodesByCategory(groupedCodes);
        setCodes(fetchedCodes);

        // Calculate total booked tables
        const activeTableCodes = fetchedCodes.filter(
          (code) => code.status !== "declined" && code.status !== "cancelled"
        );
        setTablesBookedCount(activeTableCodes.length);
      } else {
        console.log("Response is not in expected format:", fetchedCodes);
        setCodesByCategory({});
        setCodes([]);
        setTablesBookedCount(0);
      }
    } catch (error) {
      console.error("=== Fetch Error ===", error);

      // Detailed error logging
      if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("Error message:", error.message);
      }

      toast.showError("Failed to fetch table reservations");

      // Reset states to empty when there's an error
      setCodesByCategory({});
      setCodes([]);
      setTablesBookedCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute total tables and tables left
  const totalTables = Object.values(tableCategories).reduce(
    (sum, tables) => sum + tables.length,
    0
  );

  const tablesLeft = totalTables - tablesBookedCount;

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

  // Add new handler for cancel click
  const handleCancelClick = (codeId) => {
    setCancelCodeId(codeId);
    setShowConfirmCancel(true);
  };

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    if (deleteCodeId) {
      setIsLoading(true);
      try {
        const loadingToast = toast.showLoading("Deleting reservation...");
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/code/table/delete/${deleteCodeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        loadingToast.dismiss();
        toast.showSuccess("Reservation deleted successfully");
        refreshCounts();
        fetchCodes();

        // Add additional refreshTrigger increment to ensure TableLayout updates
        if (typeof refreshTrigger === "number") {
          // Create a custom event that TableSystem can listen for
          const event = new CustomEvent("tableCountUpdated", {
            detail: { type: "delete" },
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error deleting reservation", error);

        // Detailed error logging
        if (error.response) {
          console.error(
            "Response error:",
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          console.error("Request error:", error.request);
        } else {
          console.error("Error message:", error.message);
        }

        toast.showError("Failed to delete reservation");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Add confirm cancel function
  const confirmCancel = async () => {
    setShowConfirmCancel(false);
    if (cancelCodeId) {
      setIsLoading(true);
      try {
        const loadingToast = toast.showLoading("Cancelling reservation...");
        await axios.put(
          `${process.env.REACT_APP_API_BASE_URL}/code/table/status/${cancelCodeId}`,
          { status: "cancelled" },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        loadingToast.dismiss();
        toast.showSuccess("Reservation cancelled successfully");
        refreshCounts();
        fetchCodes();

        // Add additional refreshTrigger increment to ensure TableLayout updates
        if (typeof refreshTrigger === "number") {
          // Create a custom event that TableSystem can listen for
          const event = new CustomEvent("tableCountUpdated", {
            detail: { type: "cancel" },
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        toast.showError("Failed to cancel reservation");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStatusChange = async (codeId, newStatus) => {
    // For cancel status, use the confirmation dialog
    if (newStatus === "cancelled") {
      handleCancelClick(codeId);
      return;
    }

    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading(
        `${
          newStatus === "confirmed" ? "Confirming" : "Updating"
        } reservation...`
      );
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/status/${codeId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      loadingToast.dismiss();
      toast.showSuccess(
        `Reservation ${
          newStatus === "confirmed" ? "confirmed" : "updated"
        } successfully`
      );
      refreshCounts();
      fetchCodes();

      // Add additional refreshTrigger increment to ensure TableLayout updates
      if (typeof refreshTrigger === "number") {
        // Create a custom event that TableSystem can listen for
        const event = new CustomEvent("tableCountUpdated", {
          detail: { type: "statusChange", status: newStatus },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.showError("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading("Preparing your table code...");

      // Use the PNG endpoint for viewing
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${codeId}/png`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

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

      // Detailed error logging
      if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("Error message:", error.message);
      }

      toast.showError("Failed to view the table code");
      setIsLoading(false);
    }
  };

  const handleDownload = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading(
        "Downloading table code as PNG..."
      );

      // Get the code to determine filename
      const code = codes.find((c) => c._id === codeId);
      if (!code) {
        toast.showError("Code not found");
        setIsLoading(false);
        return;
      }

      // Use the PNG download endpoint
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${codeId}/png-download`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Table_${code.tableNumber}_${code.name.replace(/\s+/g, "_")}.png`
      );
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsLoading(false);
        loadingToast.dismiss();
        toast.showSuccess("Table code downloaded successfully");
      }, 500);
    } catch (error) {
      console.error("Error downloading code:", error);

      // Detailed error logging
      if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("Error message:", error.message);
      }

      toast.showError("Failed to download the table code");
      setIsLoading(false);
    }
  };

  const handleSendEmail = (codeId) => {
    // Find the code to get the guest name for the email
    const code = codes.find((c) => c._id === codeId);
    if (code) {
      setEmailRecipient(code.email || ""); // Use existing email if available
      setSelectedCodeId(codeId);
      setShowSendEmailModal(true);
    }
  };

  const confirmSendEmail = async () => {
    if (!emailRecipient || !selectedCodeId) {
      toast.showError("Email address is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRecipient)) {
      toast.showError("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);
    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading("Sending email...");

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${selectedCodeId}/send`,
        { email: emailRecipient },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      loadingToast.dismiss();
      toast.showSuccess("Table code sent successfully");
      setShowSendEmailModal(false);
      setEmailRecipient("");
      setSelectedCodeId(null);
    } catch (error) {
      console.error("Error sending email:", error);

      // Detailed error logging
      if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("Error message:", error.message);
      }

      toast.showError("Failed to send email");
    } finally {
      setIsSendingEmail(false);
      setIsLoading(false);
    }
  };

  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name);
    setEditPax(code.pax);
    setEditTableNumber(code.tableNumber);
  };

  const handleEdit = async () => {
    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading("Updating reservation...");
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/edit/${editCodeId}`,
        {
          name: editName,
          pax: editPax,
          tableNumber: editTableNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      loadingToast.dismiss();
      toast.showSuccess("Reservation updated successfully");
      refreshCounts();
      fetchCodes();
      setEditCodeId(null);
      resetEditFields();
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.showError("Failed to update reservation");
    } finally {
      setIsLoading(false);
    }
  };

  const resetEditFields = () => {
    setEditCodeId(null);
    setEditName("");
    setEditPax("");
    setEditTableNumber("");
  };

  const isTableBooked = (table) => {
    return codes.some(
      (code) =>
        code.tableNumber === table &&
        ["confirmed", "pending", "declined"].includes(code.status) &&
        code._id !== editCodeId // Exclude the code being edited
    );
  };

  // **Fix:** Move getCategoryCounts before renderCategoryTitle
  // ✨ Set total to the total number of tables in the category
  const getCategoryCounts = (category) => {
    const categoryItems =
      codesByCategory[category]?.filter(
        (code) => user.isAdmin || code.hostId === user._id
      ) || [];

    const totalTablesInCategory = tableCategories[category].length; // Total tables available in the category
    const acceptedCount = categoryItems.filter(
      (code) => code.status === "confirmed"
    ).length;
    const pendingCount = categoryItems.filter(
      (code) => code.status === "pending"
    ).length;

    return {
      total: totalTablesInCategory, // Updated to reflect total tables
      accepted: acceptedCount,
      pending: pendingCount,
    };
  };

  const renderCategoryTitle = (category) => {
    const counts = getCategoryCounts(category);
    // Format the display name properly for DJ Area
    const displayName =
      category === "djarea"
        ? "DJ Area"
        : category.charAt(0).toUpperCase() + category.slice(1);

    return (
      <div className="category-header">
        <h3>
          <span style={{ color: tableColors[category] }}>{displayName}</span>
          <div className="category-counts">
            {user.isAdmin ? (
              <>
                {counts.pending > 0 && (
                  <span className="count-pending">
                    {counts.pending} Pending
                  </span>
                )}
                <span className="count-total">
                  {counts.accepted}/{counts.total} Reserved
                </span>
              </>
            ) : (
              <span className="count-total">
                {counts.accepted}/{counts.total} Confirmed
              </span>
            )}
          </div>
        </h3>
      </div>
    );
  };

  const renderCodeItem = (code) => {
    // Get the category for the table
    const category = getCategoryForTable(code.tableNumber);
    const borderColor = tableColors[category] || "#ccc";

    return (
      <div
        key={code._id}
        className={`reservation-item ${code.status} ${
          code.paxChecked > 0 ? "checked-in" : ""
        }`}
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        {editCodeId === code._id ? (
          <div className="edit-form">
            <input
              type="text"
              placeholder="Guest Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <select
              value={editPax}
              onChange={(e) => setEditPax(e.target.value)}
            >
              {/* Changed options from 1-5 to 1-10 */}
              {[...Array(10)].map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} People
                </option>
              ))}
            </select>

            <select
              value={editTableNumber}
              onChange={(e) => setEditTableNumber(e.target.value)}
            >
              {tableCategories[getCategoryForTable(code.tableNumber)].map(
                (table) => (
                  <option
                    key={table}
                    value={table}
                    disabled={isTableBooked(table)}
                  >
                    {table} {isTableBooked(table) ? "(Unavailable)" : ""}
                  </option>
                )
              )}
            </select>
            <div className="edit-actions">
              <button onClick={handleEdit} className="action-btn">
                ✓ Save
              </button>
              <button onClick={resetEditFields} className="action-btn">
                ✕ Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="reservation-details">
            <div className="reservation-info">
              <span
                className="table-number"
                style={{
                  color: tableColors[getCategoryForTable(code.tableNumber)],
                }}
              >
                {code.tableNumber}
              </span>
              <span className="guest-name">{code.name}</span>
              <span className="pax-count">
                {code.pax} People
                {code.paxChecked > 0 && (
                  <span className="checked-count">
                    ({code.paxChecked}/{code.pax} in)
                  </span>
                )}
              </span>
              <span className={`status-badge ${code.status}`}>
                {code.status}
              </span>
              <span className="host-name">Host: {code.host}</span>
            </div>

            <div className="reservation-actions">
              {user.isAdmin ? (
                <>
                  {/* Admin actions - updated with emoji icons */}
                  {code.status === "pending" && (
                    <>
                      <button
                        className="action-btn confirm"
                        onClick={() =>
                          handleStatusChange(code._id, "confirmed")
                        }
                        title="Confirm"
                      >
                        ✓
                      </button>
                      <button
                        className="action-btn decline"
                        onClick={() => handleStatusChange(code._id, "declined")}
                        title="Decline"
                      >
                        ✕
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {code.status === "confirmed" && (
                    <>
                      <button
                        className="action-btn view"
                        onClick={() => handleCodeView(code._id)}
                        title="View QR"
                      >
                        👁️
                      </button>
                      <button
                        className="action-btn download"
                        onClick={() => handleDownload(code._id)}
                        title="Download"
                      >
                        📥
                      </button>
                      <button
                        className="action-btn email"
                        onClick={() => handleSendEmail(code._id)}
                        title="Send Email"
                      >
                        📧
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn cancel"
                        onClick={() => handleCancelClick(code._id)}
                        title="Cancel Reservation"
                      >
                        ❌
                      </button>
                    </>
                  )}
                  {["declined", "cancelled"].includes(code.status) && (
                    <>
                      <button
                        className="action-btn reset"
                        onClick={() => handleStatusChange(code._id, "pending")}
                        title="Reset to Pending"
                      >
                        🔄
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Non-admin actions - updated with emoji icons */}
                  {code.hostId === user._id && (
                    <>
                      {code.status === "pending" && (
                        <>
                          <button
                            className="action-btn edit"
                            onClick={() => startEdit(code)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteClick(code._id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {code.status === "confirmed" && (
                        <>
                          <button
                            className="action-btn view"
                            onClick={() => handleCodeView(code._id)}
                            title="View QR"
                          >
                            👁️
                          </button>
                          <button
                            className="action-btn download"
                            onClick={() => handleDownload(code._id)}
                            title="Download"
                          >
                            📥
                          </button>
                          <button
                            className="action-btn email"
                            onClick={() => handleSendEmail(code._id)}
                            title="Send Email"
                          >
                            📧
                          </button>
                          <button
                            className="action-btn cancel"
                            onClick={() => handleCancelClick(code._id)}
                            title="Cancel Reservation"
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="table-code-management">
      {/* PNG View Modal - Fullscreen */}
      {showPngModal && (
        <div className="code-png-modal">
          <button className="close-btn" onClick={() => setShowPngModal(false)}>
            ✕
          </button>
          <div className="png-container">
            <img src={pngUrl} alt="Table Code" />
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showSendEmailModal && (
        <div className="send-email-modal-overlay">
          <div className="send-email-modal-content">
            <h3>Send Table Code via Email</h3>
            <p>Enter the recipient's email address:</p>
            <input
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="email@example.com"
              disabled={isSendingEmail}
            />
            <div className="send-email-modal-buttons">
              <button
                className="confirm-btn"
                onClick={confirmSendEmail}
                disabled={isSendingEmail}
              >
                📧 Send
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowSendEmailModal(false)}
                disabled={isSendingEmail}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <p>Are you sure you want to delete this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="confirm-btn"
                onClick={confirmDelete}
                style={{ backgroundColor: "#dc3545", color: "white" }}
              >
                🗑️ Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmDelete(false)}
                style={{ backgroundColor: "#f8f9fa", color: "#495057" }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showConfirmCancel && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <p>Are you sure you want to cancel this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="confirm-btn"
                onClick={confirmCancel}
                style={{ backgroundColor: "#dc3545", color: "white" }}
              >
                ❌ Cancel Reservation
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmCancel(false)}
                style={{ backgroundColor: "#f8f9fa", color: "#495057" }}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <p>Loading reservations...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="no-reservations">
          <p>No table reservations found for this event.</p>
          <p>Create a new reservation by selecting a table above.</p>
        </div>
      ) : (
        <div className="reservations-list">
          {categoryOrder.map((category) => {
            const categoryItems = codesByCategory[category]?.filter(
              (code) => user.isAdmin || code.hostId === user._id
            );

            return categoryItems?.length > 0 ? (
              <div key={category} className="table-category">
                {renderCategoryTitle(category)}
                {categoryItems.map((code) => renderCodeItem(code))}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default TableCodeManagement;
