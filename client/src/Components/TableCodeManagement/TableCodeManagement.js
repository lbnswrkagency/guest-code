// TableCodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./TableCodeManagement.scss";
import moment from "moment";

function TableCodeManagement({
  user,
  refreshCounts,
  dataInterval,
  tableCategories,
  refreshTrigger,
}) {
  const [codes, setCodes] = useState([]);
  const [codesByCategory, setCodesByCategory] = useState({});
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [codeViewUrl, setCodeViewUrl] = useState("");
  const [showCodeView, setShowCodeView] = useState(false);
  const [tablesBookedCount, setTablesBookedCount] = useState(0);

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
    const fetchCodes = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/code/table/codes`,
          {
            params: {
              startDate: dataInterval.startDate.toISOString(),
              endDate: dataInterval.endDate.toISOString(),
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const fetchedCodes = response.data.filter((code) => {
          const codeDate = moment(code.createdAt);
          const isInRange = codeDate.isBetween(
            dataInterval.startDate,
            dataInterval.endDate,
            undefined,
            "[]"
          );

          return isInRange;
        });

        // Sort and group the codes...
        const groupedCodes = categoryOrder.reduce((acc, category) => {
          acc[category] = fetchedCodes.filter(
            (code) => getCategoryForTable(code.tableNumber) === category
          );
          return acc;
        }, {});

        setCodesByCategory(groupedCodes);
        setCodes(fetchedCodes);
      } catch (error) {
        console.error("=== Fetch Error ===", error);
        toast.error("Failed to fetch table reservations");
      }
    };

    fetchCodes();
  }, [
    dataInterval.startDate.toISOString(),
    dataInterval.endDate.toISOString(),
    refreshCounts,
    refreshTrigger,
  ]);

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
      } catch (error) {
        console.error("Error deleting reservation", error);
        toast.error("Failed to delete reservation");
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
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      toast.loading("Loading QR code...");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/code/${codeId}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setCodeViewUrl(url);
      setShowCodeView(true);
      toast.dismiss();
    } catch (error) {
      console.error("Error displaying code:", error);
      toast.error("Failed to load QR code");
    }
  };

  const handleDownload = async (codeId) => {
    try {
      toast.loading("Preparing download...");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/code/${codeId}`,
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
      let filename = `${code.name}-TableCode.png`;

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
      toast.dismiss();
      toast.success("Code downloaded successfully.");
    } catch (error) {
      console.error("Error downloading code:", error);
      toast.error("Failed to download the code.");
    }
  };

  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name);
    setEditPax(code.pax);
    setEditTableNumber(code.tableNumber);
  };

  const handleEdit = async () => {
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
      setEditCodeId(null);
      resetEditFields();
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.error("Failed to update reservation");
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
                            className="action-btn"
                            onClick={() => handleCodeView(code._id)}
                            title="View QR"
                          >
                            <img src="/image/show-icon.svg" alt="View QR" />
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => handleDownload(code._id)}
                            title="Download"
                          >
                            <img
                              src="/image/download-icon.svg"
                              alt="Download"
                            />
                          </button>
                          <button
                            className="action-btn"
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
      {showCodeView && (
        <div
          className="code-view-overlay"
          onClick={() => setShowCodeView(false)}
        >
          <div className="code-view-content">
            <img src={codeViewUrl} alt="QR Code" />
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
    </div>
  );
}

export default TableCodeManagement;
