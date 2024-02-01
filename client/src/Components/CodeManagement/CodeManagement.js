import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CodeManagement.scss";
import toast, { Toaster } from "react-hot-toast";

function CodeManagement({
  user,
  type,
  triggerUpdate,
  updateCount,
  limit,
  refreshCounts,
}) {
  const [codes, setCodes] = useState([]);
  const [visibleCodes, setVisibleCodes] = useState(10);
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
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
          { params: { userId: user._id } }
        );
        setCodes(
          response.data.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      } catch (error) {
        console.error("Error fetching codes", error);
      }
    };

    fetchCodes();
  }, [user._id, type, triggerUpdate]);

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
        triggerUpdate();
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
          // Add other fields if needed
        }
      );
      triggerUpdate();
      toast.dismiss();
      toast.success("Code updated successfully.");
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
      {codes.slice(0, visibleCodes).map((code) => (
        <div
          key={code._id}
          className={`code-management-item ${
            code.paxChecked === code.pax ? "code-management-item-checked" : ""
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
                  src="/image/check-icon.svg"
                  alt="Confirm"
                />
              </button>
              <button
                className="code-management-item-button cancel-icon"
                onClick={cancelEdit}
              >
                <img
                  className="code-management-item-icon"
                  src="/image/cancel-icon.svg"
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