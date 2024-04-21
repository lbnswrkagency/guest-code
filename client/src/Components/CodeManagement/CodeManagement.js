import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CodeManagement.scss";
import toast, { Toaster } from "react-hot-toast";
import moment from "moment";
import { useCurrentEvent } from "../CurrentEvent/CurrentEvent";

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
}) {
  const { dataInterval } = useCurrentEvent();
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [codeViewUrl, setCodeViewUrl] = useState("");
  const [showCodeView, setShowCodeView] = useState(false);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const apiUrl = `/code/${type.toLowerCase()}/codes`;
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}${apiUrl}`,
          {
            params: {
              userId: user._id,
              startDate: dataInterval.startDate.toISOString(),
              endDate: dataInterval.endDate.toISOString(),
            },
          }
        );
        if (type.toLowerCase() === "table") {
          setCodes(
            response.data.sort((a, b) => {
              const groupA = a.tableNumber[0];
              const groupB = b.tableNumber[0];
              const numberA = parseInt(a.tableNumber.substring(1), 10);
              const numberB = parseInt(b.tableNumber.substring(1), 10);

              if (groupA === groupB) {
                return numberA - numberB; // Sort by number within the same group
              }

              // B always comes first, then K, then A
              if (groupA === "B") return -1;
              if (groupB === "B") return 1;
              if (groupA === "K") return -1;
              if (groupB === "K") return 1;
              return numberA - numberB; // Default to numerical sort if A group
            })
          );
        } else {
          setCodes(
            response.data.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )
          );
        }
      } catch (error) {
        console.error("Error fetching codes", error);
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
          }/code/${type.toLowerCase()}/delete/${deleteCodeId}`
        );
        toast.dismiss();
        toast.success("Code deleted successfully.");
        refreshCounts(); // Call the passed refreshCounts function from CodeGenerator
      } catch (error) {
        console.error("Error deleting code", error);
        toast.error("Failed to delete the code.");
      }
    }
  };

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };
  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name);
    setEditPax(code.pax); // Set the initial value for editing
    setEditTableNumber(code.tableNumber); // Set the initial value for editing
  };

  const handleEdit = async () => {
    try {
      toast.loading("Updating code...");
      const response = await axios.put(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/code/${type.toLowerCase()}/edit/${editCodeId}`,
        {
          name: editName,
          // pax: editPax, // Assuming you have this state
          // tableNumber: editTableNumber, // Assuming you have this state
        }
      );
      toast.dismiss();
      toast.success("Code updated successfully.");
      refreshCounts();
      setEditCodeId(null);
      setEditName("");
    } catch (error) {
      console.error("Error updating code:", error);
      toast.error("Failed to update the code.");
    }
  };

  const cancelEdit = () => {
    setEditCodeId(null);
    setEditName("");
  };

  const handleCodeClick = async (codeId) => {
    try {
      toast.loading("Loading code...");
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/code/${type.toLowerCase()}/code/${codeId}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
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
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `code-${codeId}.png`);
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

      {type === "Table"
        ? counts.tableCounts.slice(0, visibleCodes).map((code) => (
            <div
              key={code._id}
              className={`code-management-item code-management-item-table ${
                code.used ? "code-management-item-checked" : ""
              }`}
            >
              {editCodeId === code._id ? (
                <>
                  <input
                    type="text"
                    placeholder="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  {/* <input
                  type="number"
                  placeholder="People (Pax)"
                  value={editPax}
                  onChange={(e) => setEditPax(e.target.value)} // Correctly handle state update
                />
                <input
                  type="text"
                  placeholder="Table Number"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)} // Correctly handle state update
                /> */}
                </>
              ) : (
                <>
                  <div className="code-management-info">
                    <span onClick={() => handleCodeClick(code._id)}>
                      {code.table}
                    </span>
                    <span onClick={() => handleCodeClick(code._id)}>
                      {code.name}
                    </span>
                    <span onClick={() => handleCodeClick(code._id)}>
                      {code.total} People
                    </span>
                  </div>

                  <button
                    className="code-management-item-button"
                    onClick={() => handleCodeClick(code._id)}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/show-icon.svg"
                      alt="Show"
                    />
                  </button>
                  <button
                    className="code-management-item-button"
                    onClick={() => handleDownload(code._id)}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/download-icon.svg"
                      alt="Download"
                    />
                  </button>
                </>
              )}

              {editCodeId === code._id ? (
                <>
                  <button
                    className="code-management-item-button check-icon"
                    onClick={handleEdit}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/check-icon_w.svg"
                      alt="Confirm"
                    />
                  </button>
                  <button
                    className="code-management-item-button cancel-icon"
                    onClick={cancelEdit}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/cancel-icon_w.svg"
                      alt="Cancel"
                    />
                  </button>
                </>
              ) : (
                <>
                  {/* <button
                  className="code-management-item-button"
                  onClick={() => startEdit(code)}
                >
                  <img
                    className="code-management-item-icon"
                    src="/image/edit-icon.svg"
                    alt="Edit"
                  />
                </button> */}
                  <button
                    className="code-management-item-button"
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
          ))
        : codes.slice(0, visibleCodes).map((code) => (
            <div
              key={code._id}
              className={`code-management-item ${
                code.paxChecked === code.pax
                  ? "code-management-item-checked"
                  : ""
              }`}
            >
              {editCodeId === code._id ? (
                <input
                  type="text"
                  className="code-management-item-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              ) : (
                <>
                  <span
                    className="code-name"
                    onClick={() => handleCodeClick(code._id)}
                  >
                    {code.name}
                  </span>
                  <button
                    className="code-management-item-button"
                    onClick={() => handleCodeClick(code._id)}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/show-icon.svg"
                      alt="Show"
                    />
                  </button>
                  <button
                    className="code-management-item-button"
                    onClick={() => handleDownload(code._id)}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/download-icon.svg"
                      alt="Download"
                    />
                  </button>
                </>
              )}

              {editCodeId === code._id ? (
                <>
                  <button
                    className="code-management-item-button check-icon"
                    onClick={handleEdit}
                  >
                    <img
                      className="code-management-item-icon "
                      src="/image/check-icon_w.svg"
                      alt="Confirm"
                    />
                  </button>
                  <button
                    className="code-management-item-button cancel-icon"
                    onClick={cancelEdit}
                  >
                    <img
                      className="code-management-item-icon"
                      src="/image/cancel-icon_w.svg"
                      alt="Cancel"
                    />
                  </button>
                </>
              ) : (
                code.paxChecked !== code.pax && (
                  <>
                    <button
                      className="code-management-item-button"
                      onClick={() => startEdit(code)}
                    >
                      <img
                        className="code-management-item-icon"
                        src="/image/edit-icon.svg"
                        alt="Edit"
                      />
                    </button>
                    <button
                      className="code-management-item-button"
                      onClick={() => handleDeleteClick(code._id)}
                    >
                      <img
                        className="code-management-item-icon"
                        src="/image/delete-icon.svg"
                        alt="Delete"
                      />
                    </button>
                  </>
                )
              )}
            </div>
          ))}

      {visibleCodes < codes.length && (
        <button className="code-management-load" onClick={loadMore}>
          <img
            className="code-management-item-icon"
            src="/image/load-icon.svg"
            alt="Load"
          />
        </button>
      )}
    </div>
  );
}

export default CodeManagement;
