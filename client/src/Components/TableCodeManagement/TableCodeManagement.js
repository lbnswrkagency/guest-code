// TableCodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./TableCodeManagement.scss";

function TableCodeManagement({
  user,
  triggerRefresh,
  tableCategories,
  refreshTrigger,
  selectedEvent,
  counts,
  isLoading: parentIsLoading,
}) {
  const toast = useToast();
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
  const [isLoading, setIsLoading] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelCodeId, setCancelCodeId] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState(10);

  const tableColors = {
    djarea: "#ffd700", // Gold for DJ Area tables
    backstage: "#80221c", // Rich red for backstage
    vip: "#1b5e20", // Your new green for VIP
    premium: "#4a90e2", // Blue for premium
  };

  const categoryOrder = ["djarea", "backstage", "vip", "premium"];

  const getCategoryForTable = (tableNumber) => {
    if (!tableNumber) return "unknown";
    if (tableNumber.startsWith("B")) return "djarea";
    if (tableNumber.startsWith("P") || tableNumber.startsWith("E"))
      return "backstage";
    if (
      tableNumber.startsWith("A") ||
      tableNumber.startsWith("F") ||
      tableNumber.startsWith("R")
    )
      return "vip";
    if (tableNumber.startsWith("K")) return "premium";
    return "unknown";
  };

  useEffect(() => {
    const allCodes = counts?.tableCounts || [];

    // Group the codes received from props
    const groupedCodes = categoryOrder.reduce((acc, category) => {
      acc[category] = allCodes.filter(
        (code) => getCategoryForTable(code.tableNumber) === category
      );
      return acc;
    }, {});

    setCodesByCategory(groupedCodes);

    // Reset visible codes count when data changes significantly
    setVisibleCodes(10);
  }, [counts, refreshTrigger]);

  const allCodes = counts?.tableCounts || [];
  const activeTableCodes = allCodes.filter(
    (code) => code.status !== "declined" && code.status !== "cancelled"
  );
  const tablesBookedCount = activeTableCodes.length;
  const totalTables = Object.values(tableCategories).reduce(
    (sum, tables) => sum + tables.length,
    0
  );
  const tablesLeft = totalTables - tablesBookedCount;

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

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
        triggerRefresh();

        const event = new CustomEvent("tableCountUpdated", {
          detail: { type: "delete" },
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("Error deleting reservation", error);
        toast.showError(
          error.response?.data?.message || "Failed to delete reservation"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

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
        triggerRefresh();

        const event = new CustomEvent("tableCountUpdated", {
          detail: { type: "cancel" },
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        toast.showError(
          error.response?.data?.message || "Failed to cancel reservation"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStatusChange = async (codeId, newStatus) => {
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
        `Reservation ${newStatus === "confirmed" ? "confirmed" : "updated"}`
      );
      triggerRefresh();

      const event = new CustomEvent("tableCountUpdated", {
        detail: { type: "statusChange", status: newStatus },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.showError(
        error.response?.data?.message || "Failed to update status"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading("Preparing your table code...");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${codeId}/png`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const reader = new FileReader();
      reader.readAsDataURL(response.data);
      reader.onloadend = () => {
        setPngUrl(reader.result);
        setShowPngModal(true);
        loadingToast.dismiss();
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Error viewing code:", error);
      toast.showError(
        error.response?.data?.message || "Failed to view the table code"
      );
      setIsLoading(false);
    }
  };

  const handleDownload = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading(
        "Downloading table code as PNG..."
      );
      const code = allCodes.find((c) => c._id === codeId);
      if (!code) {
        toast.showError("Code not found");
        setIsLoading(false);
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/table/code/${codeId}/png-download`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
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
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsLoading(false);
        loadingToast.dismiss();
        toast.showSuccess("Table code downloaded successfully");
      }, 500);
    } catch (error) {
      console.error("Error downloading code:", error);
      toast.showError(
        error.response?.data?.message || "Failed to download the table code"
      );
      setIsLoading(false);
    }
  };

  const handleSendEmail = (codeId) => {
    const code = allCodes.find((c) => c._id === codeId);
    if (code) {
      setEmailRecipient(code.email || "");
      setSelectedCodeId(codeId);
      setShowSendEmailModal(true);
    }
  };

  const confirmSendEmail = async () => {
    if (!emailRecipient || !selectedCodeId) {
      toast.showError("Email address is required");
      return;
    }
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
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
      toast.showError(error.response?.data?.message || "Failed to send email");
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
      triggerRefresh();
      setEditCodeId(null);
      resetEditFields();

      const event = new CustomEvent("tableCountUpdated", {
        detail: { type: "edit" },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.showError(
        error.response?.data?.message || "Failed to update reservation"
      );
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
    return allCodes.some(
      (code) =>
        code.tableNumber === table &&
        code.status !== "declined" &&
        code.status !== "cancelled" &&
        code._id !== editCodeId
    );
  };

  const getCategoryCounts = (category) => {
    const categoryItems =
      allCodes.filter(
        (code) =>
          getCategoryForTable(code.tableNumber) === category &&
          (user.isAdmin || code.hostId === user._id)
      ) || [];

    const totalTablesInCategory = tableCategories[category]?.length || 0;
    const acceptedCount = categoryItems.filter(
      (code) => code.status === "confirmed"
    ).length;
    const pendingCount = categoryItems.filter(
      (code) => code.status === "pending"
    ).length;

    return {
      total: totalTablesInCategory,
      accepted: acceptedCount,
      pending: pendingCount,
    };
  };

  const renderCategoryTitle = (category) => {
    const counts = getCategoryCounts(category);
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
    const category = getCategoryForTable(code.tableNumber);
    const borderColor = tableColors[category] || "#ccc";
    const isEditing = editCodeId === code._id;

    return (
      <div
        key={code._id}
        className={`reservation-item ${code.status} ${
          code.paxChecked > 0 ? "checked-in" : ""
        } ${isEditing ? "editing" : ""}`}
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <div className="reservation-details">
          <div className="reservation-info">
            <div
              className="table-number-badge"
              style={{
                background: `linear-gradient(45deg, ${borderColor}, ${borderColor}dd)`,
              }}
            >
              {isEditing ? (
                <div className="table-select-inline-wrapper">
                  <select
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="table-select-inline"
                  >
                    {categoryOrder.map((category) => (
                      <optgroup
                        key={category}
                        label={
                          category === "djarea"
                            ? "DJ Area"
                            : category.charAt(0).toUpperCase() +
                              category.slice(1)
                        }
                      >
                        {tableCategories[category]?.map((table) => (
                          <option
                            key={table}
                            value={table}
                            disabled={isTableBooked(table)}
                          >
                            {table}
                          </option>
                        )) || null}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                code.tableNumber
              )}
            </div>
            <div className="guest-details">
              {isEditing ? (
                <input
                  type="text"
                  className="edit-name-input"
                  placeholder="Guest Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="guest-name">{code.name}</div>
              )}
              <div className="host-name">Host: {code.host}</div>
              <span className={`status-badge ${code.status}`}>
                {code.status}
              </span>
            </div>
          </div>

          <div className="pax-count-badge">
            <span className="people-icon">👥</span>
            <span className="people-count">
              {code.paxChecked > 0 ? code.paxChecked : 0}
            </span>
            <span className="people-separator">/</span>
            {isEditing ? (
              <select
                className="edit-pax-select"
                value={editPax}
                onChange={(e) => setEditPax(e.target.value)}
              >
                {[...Array(10)].map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
            ) : (
              <span className="people-max">{code.pax}</span>
            )}
          </div>

          <div className="reservation-actions">
            {isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="save-edit-btn"
                  title="Save"
                  disabled={isLoading}
                >
                  ✓
                </button>
                <button
                  onClick={resetEditFields}
                  className="cancel-edit-btn"
                  title="Cancel"
                  disabled={isLoading}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                {user.isAdmin ? (
                  <>
                    {code.status === "pending" && (
                      <>
                        <button
                          className="confirm"
                          onClick={() =>
                            handleStatusChange(code._id, "confirmed")
                          }
                          title="Confirm"
                          disabled={isLoading}
                        >
                          ✓
                        </button>
                        <button
                          className="decline"
                          onClick={() =>
                            handleStatusChange(code._id, "declined")
                          }
                          title="Decline"
                          disabled={isLoading}
                        >
                          ✕
                        </button>
                        <button
                          className="edit"
                          onClick={() => startEdit(code)}
                          title="Edit"
                          disabled={isLoading}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete"
                          onClick={() => handleDeleteClick(code._id)}
                          title="Delete"
                          disabled={isLoading}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    {code.status === "confirmed" && (
                      <>
                        <button
                          className="email"
                          onClick={() => handleSendEmail(code._id)}
                          title="Send Email"
                          disabled={isLoading}
                        >
                          📧
                        </button>
                        <button
                          className="download"
                          onClick={() => handleDownload(code._id)}
                          title="Download"
                          disabled={isLoading}
                        >
                          📥
                        </button>
                        <button
                          className="view"
                          onClick={() => handleCodeView(code._id)}
                          title="View QR"
                          disabled={isLoading}
                        >
                          👁️
                        </button>
                        <button
                          className="edit"
                          onClick={() => startEdit(code)}
                          title="Edit"
                          disabled={isLoading}
                        >
                          ✏️
                        </button>
                        <button
                          className="cancel"
                          onClick={() => handleCancelClick(code._id)}
                          title="Cancel Reservation"
                          disabled={isLoading}
                        >
                          ❌
                        </button>
                      </>
                    )}
                    {["declined", "cancelled"].includes(code.status) && (
                      <>
                        <button
                          className="reset"
                          onClick={() =>
                            handleStatusChange(code._id, "pending")
                          }
                          title="Reset to Pending"
                          disabled={isLoading}
                        >
                          🔄
                        </button>
                        <button
                          className="delete"
                          onClick={() => handleDeleteClick(code._id)}
                          title="Delete"
                          disabled={isLoading}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {code.hostId === user._id && (
                      <>
                        {code.status === "pending" && (
                          <>
                            <button
                              className="edit"
                              onClick={() => startEdit(code)}
                              title="Edit"
                              disabled={isLoading}
                            >
                              ✏️
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeleteClick(code._id)}
                              title="Delete"
                              disabled={isLoading}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {code.status === "confirmed" && (
                          <>
                            <button
                              className="email"
                              onClick={() => handleSendEmail(code._id)}
                              title="Send Email"
                              disabled={isLoading}
                            >
                              📧
                            </button>
                            <button
                              className="download"
                              onClick={() => handleDownload(code._id)}
                              title="Download"
                              disabled={isLoading}
                            >
                              📥
                            </button>
                            <button
                              className="view"
                              onClick={() => handleCodeView(code._id)}
                              title="View QR"
                              disabled={isLoading}
                            >
                              👁️
                            </button>
                            <button
                              className="edit"
                              onClick={() => startEdit(code)}
                              title="Edit"
                              disabled={isLoading}
                            >
                              ✏️
                            </button>
                            <button
                              className="cancel"
                              onClick={() => handleCancelClick(code._id)}
                              title="Cancel Reservation"
                              disabled={isLoading}
                            >
                              ❌
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const loadMore = () => {
    setVisibleCodes((prev) => prev + 10);
  };

  const totalVisibleCodes = allCodes.filter(
    (code) => user.isAdmin || code.hostId === user._id
  ).length;

  return (
    <div className="table-code-management">
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
            <button
              className="close-btn"
              onClick={() => setShowSendEmailModal(false)}
            >
              ×
            </button>
            <h3>Send Invitation to</h3>
            <input
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="recipient@example.com"
              disabled={isSendingEmail}
              autoFocus
            />
            <div className="send-email-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowSendEmailModal(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={confirmSendEmail}
                disabled={isSendingEmail || !emailRecipient}
              >
                {isSendingEmail ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowConfirmDelete(false)}
            >
              ✕
            </button>
            <h3>Delete Reservation</h3>
            <p>Are you sure you want to delete this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmCancel && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowConfirmCancel(false)}
            >
              ✕
            </button>
            <h3>Cancel Reservation</h3>
            <p>Are you sure you want to cancel this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmCancel(false)}
              >
                Close
              </button>
              <button className="confirm-btn" onClick={confirmCancel}>
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {parentIsLoading ? (
        <div className="loading-state">
          <p>Loading reservations...</p>
        </div>
      ) : allCodes.length === 0 ? (
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
            const visibleItems = categoryItems?.slice(0, visibleCodes);

            return visibleItems?.length > 0 ? (
              <div key={category} className="table-category">
                {renderCategoryTitle(category)}
                {visibleItems.map((code) => renderCodeItem(code))}
              </div>
            ) : null;
          })}

          {totalVisibleCodes > visibleCodes && (
            <button
              className="load-more-btn"
              onClick={loadMore}
              style={{
                backgroundColor: `${
                  selectedEvent?.primaryColor || "#FFC807"
                }20`,
                borderColor: `${selectedEvent?.primaryColor || "#FFC807"}40`,
              }}
              disabled={isLoading}
            >
              Load More Reservations
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TableCodeManagement;
