// CodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CodeManagement.scss";
import toast, { Toaster } from "react-hot-toast";
import moment from "moment";
import TableLayout from "../TableLayout/TableLayout"; // Import if needed for table codes

function CodeManagement({
  user,
  type,
  setCodes,
  codes,
  refreshCounts,
  currentEventDate,
  counts,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  dataInterval,
}) {
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [codeViewUrl, setCodeViewUrl] = useState("");
  const [showCodeView, setShowCodeView] = useState(false);
  const [limit, setLimit] = useState(undefined); // Add limit state
  const [totalPaxUsed, setTotalPaxUsed] = useState(0);
  const [currentEditingCodePax, setCurrentEditingCodePax] = useState(0);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const token = localStorage.getItem("token");

        const apiUrl = `/code/${type.toLowerCase()}/codes`;

        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}${apiUrl}`,
          {
            params: {
              startDate: dataInterval.startDate.toISOString(),
              endDate: dataInterval.endDate.toISOString(),
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setCodes(
          response.data.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      } catch (error) {
        console.error("Error fetching codes", error);
        toast.error("Failed to fetch codes");
      }
    };

    fetchCodes();
  }, [
    user._id,
    type,
    refreshCounts,
    dataInterval.startDate,
    dataInterval.endDate,
  ]);

  useEffect(() => {
    const calculateTotalPax = () => {
      const total = codes.reduce((sum, code) => sum + (code.pax || 1), 0);
      setTotalPaxUsed(total);
    };
    calculateTotalPax();
  }, [codes]);

  // Set the limit based on code type and user permissions
  useEffect(() => {
    const newLimit =
      type === "Backstage"
        ? user.backstageCodeLimit
        : type === "Friends"
        ? user.friendsCodeLimit
        : type === "Table"
        ? user.tableCodeLimit
        : undefined;

    setLimit(newLimit === 0 ? undefined : newLimit);
  }, [user, type]);

  const loadMore = () => {
    setVisibleCodes((prevVisible) => prevVisible + 10);
  };

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    if (deleteCodeId) {
      try {
        toast.loading("Deleting code...");
        await axios.delete(
          `${
            process.env.REACT_APP_API_BASE_URL
          }/code/${type.toLowerCase()}/delete/${deleteCodeId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        toast.dismiss();
        toast.success("Code deleted successfully.");
        refreshCounts();
      } catch (error) {
        console.error("Error deleting code", error);
        toast.error("Failed to delete the code.");
      }
    }
  };

  // Update the getMaxAllowedPax function
  const getMaxAllowedPax = () => {
    // If no limit is set, return max of 5
    if (!limit || limit === 0) return 5;

    // Get all codes except the one being edited
    const otherCodes = codes.filter((code) => code._id !== editCodeId);

    // Calculate total pax used by other codes
    const otherCodesPaxTotal = otherCodes.reduce(
      (sum, code) => sum + (code.pax || 1),
      0
    );

    // Calculate how many spots are available
    const availableSpots = limit - otherCodesPaxTotal;

    // Return the minimum between:
    // 1. Available spots plus current code's pax (to allow keeping current value)
    // 2. Maximum allowed (5)
    // But never less than the current editing code's pax
    return Math.min(Math.max(currentEditingCodePax, availableSpots), 5);
  };

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name);
    setEditPax(code.pax); // Set the initial value for editing
    setCurrentEditingCodePax(code.pax);
    setEditTableNumber(code.tableNumber); // Set the initial value for editing
  };

  const handleEdit = async () => {
    try {
      // Validate edit before sending request
      if (type !== "Table") {
        const maxAllowed = getMaxAllowedPax();

        // Get all codes except the one being edited
        const otherCodes = codes.filter((code) => code._id !== editCodeId);
        const otherCodesPaxTotal = otherCodes.reduce(
          (sum, code) => sum + (code.pax || 1),
          0
        );

        // Check if edit would exceed limit
        if (limit && limit !== 0 && otherCodesPaxTotal + editPax > limit) {
          toast.error(
            `Cannot update to ${editPax} people. It would exceed your limit of ${limit}.`
          );
          return;
        }

        if (editPax > maxAllowed) {
          toast.error(
            `Cannot update to ${editPax} people. Maximum allowed is ${maxAllowed}.`
          );
          return;
        }
      }

      toast.loading("Updating code...");

      const data = {
        name: editName,
      };

      if (type !== "Table") {
        data.pax = editPax;
      }

      if (type === "Table") {
        data.tableNumber = editTableNumber;
      }

      await axios.put(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/code/${type.toLowerCase()}/edit/${editCodeId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.dismiss();
      toast.success("Code updated successfully.");
      refreshCounts();
      cancelEdit();
    } catch (error) {
      console.error("Error updating code:", error);
      toast.error("Failed to update the code.");
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
      toast.loading("Loading code...");
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/code/${type.toLowerCase()}/code/${codeId}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const url = window.URL.createObjectURL(response.data);
      setCodeViewUrl(url);
      setShowCodeView(true); // Show the full-screen view
      toast.dismiss();
    } catch (error) {
      console.error("Error displaying code:", error);
      toast.error("Failed to display the code.");
    }
  };

  const closeCodeView = () => setShowCodeView(false);

  const handleDownload = async (codeId) => {
    try {
      toast.loading("Preparing download...");
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/code/${type.toLowerCase()}/code/${codeId}`,
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
      toast.dismiss();
      toast.success("Code downloaded successfully.");
    } catch (error) {
      console.error("Error downloading code:", error);
      toast.error("Failed to download the code.");
    }
  };

  return (
    <div className="code-management">
      <Toaster />
      {showCodeView && (
        <div className="code-management-item-view" onClick={closeCodeView}>
          <img src={codeViewUrl} alt="Code Preview" />
        </div>
      )}
      {showConfirmDelete && (
        <div className="code-management-item-delete">
          <p>Are you sure you want to delete this code?</p>
          <button onClick={confirmDelete}>Yes</button>
          <button onClick={() => setShowConfirmDelete(false)}>No</button>
        </div>
      )}

      {codes.slice(0, visibleCodes).map((code) => (
        <div
          key={code._id}
          className={`reservation-item ${
            code.paxChecked === code.pax ? "code-management-item-checked" : ""
          }`}
        >
          {editCodeId !== code._id && (
            <div className="inline-qr-code">
              <img src={code.qrCode} alt="QR Code" />
            </div>
          )}
          {editCodeId === code._id ? (
            <div className="edit-form">
              <input
                type="text"
                placeholder="Guest Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              {type !== "Table" && (
                <select
                  value={editPax}
                  onChange={(e) => setEditPax(parseInt(e.target.value))}
                >
                  {[...Array(getMaxAllowedPax())].map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1} People
                    </option>
                  ))}
                </select>
              )}
              {type === "Table" && (
                <input
                  type="text"
                  placeholder="Table Number"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                />
              )}
              <div className="edit-actions">
                <button onClick={handleEdit}>
                  <img src="/image/check-icon_w.svg" alt="Save" />
                  Save
                </button>
                <button onClick={cancelEdit}>
                  <img src="/image/cancel-icon_w.svg" alt="Cancel" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="reservation-details">
              <div className="reservation-info">
                <span
                  className="guest-name"
                  onClick={() => handleCodeClick(code._id)}
                >
                  {code.name}
                </span>
                <span className="pax-count">{code.pax} People</span>
              </div>
              <div className="reservation-actions">
                <button
                  className="action-btn view"
                  onClick={() => handleCodeClick(code._id)}
                >
                  <img
                    className="code-management-item-icon"
                    src="/image/show-icon.svg"
                    alt="Show"
                  />
                </button>

                <button
                  className="action-btn download"
                  onClick={() => handleDownload(code._id)}
                >
                  <img
                    className="code-management-item-icon"
                    src="/image/download-icon.svg"
                    alt="Download"
                  />
                </button>
                {code.paxChecked !== code.pax && (
                  <>
                    <button
                      className="action-btn edit"
                      onClick={() => startEdit(code)}
                    >
                      <img
                        className="code-management-item-icon"
                        src="/image/edit-icon.svg"
                        alt="Edit"
                      />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteClick(code._id)}
                    >
                      <img
                        className="code-management-item-icon"
                        src="/image/delete-icon.svg"
                        alt="Delete"
                      />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {visibleCodes < codes.length && (
        <button className="load-more-btn" onClick={loadMore}>
          Load More
        </button>
      )}
    </div>
  );
}

export default CodeManagement;
