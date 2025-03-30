// TableCodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
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
      fetchCodes();
    }
  }, [selectedEvent, refreshTrigger]);

  const fetchCodes = async () => {
    if (!selectedEvent || !selectedEvent._id) {
      console.log("No selectedEvent or selectedEvent._id available");
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

      toast.error("Failed to fetch table reservations");

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

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    if (deleteCodeId) {
      setIsLoading(true);
      try {
        toast.loading("Deleting reservation...");
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/code/table/delete/${deleteCodeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        toast.dismiss();
        toast.success("Reservation deleted successfully");
        refreshCounts();
        fetchCodes();
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

        toast.error("Failed to delete reservation");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ✨ **Change Made Here:** Set total to the total number of tables in the category
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

  const handleStatusChange = async (codeId, newStatus) => {
    setIsLoading(true);
    try {
      toast.loading("Updating status...");
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/status/${codeId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.dismiss();
      toast.success("Status updated successfully");
      refreshCounts();
      fetchCodes();
    } catch (error) {
      console.error("Error updating status:", error);

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

      toast.error("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      setIsLoading(true);
      toast.loading("Preparing your table code...");

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
        toast.dismiss();
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

      toast.dismiss();
      toast.error("Failed to view the table code");
      setIsLoading(false);
    }
  };

  const handleDownload = async (codeId) => {
    try {
      setIsLoading(true);
      toast.loading("Downloading table code as PNG...");

      // Get the code to determine filename
      const code = codes.find((c) => c._id === codeId);
      if (!code) {
        toast.error("Code not found");
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
        toast.dismiss();
        toast.success("Table code downloaded successfully");
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

      toast.dismiss();
      toast.error("Failed to download the table code");
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
      toast.error("Email address is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRecipient)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);
    setIsLoading(true);
    try {
      toast.loading("Sending email...");

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${selectedCodeId}/send`,
        { email: emailRecipient },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.dismiss();
      toast.success("Table code sent successfully");
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

      toast.dismiss();
      toast.error("Failed to send email");
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
      toast.loading("Updating reservation...");
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
      toast.dismiss();
      toast.success("Reservation updated successfully");
      refreshCounts();
      fetchCodes();
      setEditCodeId(null);
      resetEditFields();
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.error("Failed to update reservation");
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

  const renderCodeItem = (code) => {
    return (
      <div
        key={code._id}
        className={`reservation-item ${code.status} ${
          code.paxChecked > 0 ? "checked-in" : ""
        }`}
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
              <button onClick={handleEdit}>
                <img src="/image/check-icon_w.svg" alt="Save" />
                Save
              </button>
              <button onClick={resetEditFields}>
                <img src="/image/cancel-icon_w.svg" alt="Cancel" />
                Cancel
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
                  {/* Admin actions */}
                  {code.status === "pending" && (
                    <>
                      <button
                        className="action-btn confirm"
                        onClick={() =>
                          handleStatusChange(code._id, "confirmed")
                        }
                        title="Confirm"
                      >
                        <img src="/image/check-icon_w.svg" alt="Confirm" />
                      </button>
                      <button
                        className="action-btn decline"
                        onClick={() => handleStatusChange(code._id, "declined")}
                        title="Decline"
                      >
                        <img src="/image/cancel-icon_w.svg" alt="Decline" />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                      >
                        <img src="/image/edit-icon.svg" alt="Edit" />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                      >
                        <img src="/image/delete-icon.svg" alt="Delete" />
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
                        <img src="/image/show-icon.svg" alt="View QR" />
                      </button>
                      <button
                        className="action-btn download"
                        onClick={() => handleDownload(code._id)}
                        title="Download"
                      >
                        <img src="/image/download-icon.svg" alt="Download" />
                      </button>
                      <button
                        className="action-btn email"
                        onClick={() => handleSendEmail(code._id)}
                        title="Send Email"
                      >
                        <img src="/image/email-icon.svg" alt="Send Email" />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                      >
                        <img src="/image/edit-icon.svg" alt="Edit" />
                      </button>
                      <button
                        className="action-btn cancel"
                        onClick={() =>
                          handleStatusChange(code._id, "cancelled")
                        }
                        title="Cancel Reservation"
                      >
                        <img src="/image/cancel-icon_w.svg" alt="Cancel" />
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
                        <img src="/image/reload-icon.svg" alt="Reset" />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                      >
                        <img src="/image/delete-icon.svg" alt="Delete" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Non-admin actions */}
                  {code.hostId === user._id && (
                    <>
                      {code.status === "pending" && (
                        <>
                          <button
                            className="action-btn edit"
                            onClick={() => startEdit(code)}
                            title="Edit"
                          >
                            <img src="/image/edit-icon.svg" alt="Edit" />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteClick(code._id)}
                            title="Delete"
                          >
                            <img src="/image/delete-icon.svg" alt="Delete" />
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
                            <img src="/image/show-icon.svg" alt="View QR" />
                          </button>
                          <button
                            className="action-btn download"
                            onClick={() => handleDownload(code._id)}
                            title="Download"
                          >
                            <img
                              src="/image/download-icon.svg"
                              alt="Download"
                            />
                          </button>
                          <button
                            className="action-btn email"
                            onClick={() => handleSendEmail(code._id)}
                            title="Send Email"
                          >
                            <img src="/image/email-icon.svg" alt="Send Email" />
                          </button>
                          <button
                            className="action-btn cancel"
                            onClick={() =>
                              handleStatusChange(code._id, "cancelled")
                            }
                            title="Cancel Reservation"
                          >
                            <img src="/image/cancel-icon_w.svg" alt="Cancel" />
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
      <Toaster />

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
                <img src="/image/email-icon.svg" alt="Send" />
                Send
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowSendEmailModal(false)}
                disabled={isSendingEmail}
              >
                <img src="/image/cancel-icon_w.svg" alt="Cancel" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <p>Are you sure you want to delete this reservation?</p>
            <div className="delete-modal-buttons">
              <button className="confirm-btn" onClick={confirmDelete}>
                <img src="/image/delete-icon.svg" alt="Delete" />
                Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmDelete(false)}
              >
                <img src="/image/cancel-icon_w.svg" alt="Cancel" />
                Cancel
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
