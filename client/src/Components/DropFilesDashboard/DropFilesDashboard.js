import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./DropFilesDashboard.scss";

const DropFilesDashboard = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/events/listDroppedFiles`
      );
      setFiles(response.data.files || []);
    } catch (error) {
      toast.error("Failed to fetch files.");
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/events/getSignedUrlForDownload/${fileName}`
      );
      const { url } = response.data;
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to get download link.");
    }
  };

  const handleDelete = async (fileName) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/events/deleteDroppedFile/${fileName}`
      );
      toast.success("File deleted successfully");
      fetchFiles(); // Refresh the list after deletion
    } catch (error) {
      toast.error("Failed to delete file.");
    }
  };

  return (
    <div className="dropfiles-dashboard">
      {files.map((file) => (
        <div className="dropfiles-dashboard-item" key={file.name}>
          <span className="dropfiles-dashboard-item-name">{file.name}</span>
          <button
            className="dropfiles-dashboard-item-button"
            onClick={() => handleDownload(file.name)}
          >
            <img src="/image/download-icon.svg" alt="Download" />
          </button>
          <button
            onClick={() => handleDelete(file.name)}
            className="dropfiles-dashboard-item-button"
          >
            <img src="/image/delete-icon.svg" alt="Delete" />
          </button>
        </div>
      ))}
      <ToastContainer />
    </div>
  );
};

export default DropFilesDashboard;
