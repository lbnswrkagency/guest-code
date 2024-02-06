import React, { useState, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./DropFiles.scss";
import DropFilesDashboard from "../DropFilesDashboard/DropFilesDashboard";
import { useNavigate } from "react-router-dom";

const DropFiles = ({ onClose, showDashboard = true }) => {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) {
      toast.error("Please select a file before uploading.");
      return;
    }

    // Display a loading toast without auto-close
    const loadingToast = toast.loading(
      "Uploading, might take a minute. Please Wait..."
    );

    const formData = new FormData();
    formData.append("video", file);

    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/events/uploadVideoToS3`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Dismiss the loading toast and show a success message
      toast.dismiss(loadingToast);
      toast.success("Upload successful!");
    } catch (error) {
      // Dismiss the loading toast and show an error message
      toast.dismiss(loadingToast);
      toast.error("Upload failed. Please try again.");
    } finally {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the input after upload
      }
    }
  };

  return (
    <div className="dropfiles">
      <div
        className="login-back-arrow"
        onClick={() => (showDashboard ? onClose() : navigate("/"))}
      >
        <img src="/image/back-icon.svg" alt="" />
      </div>

      <img
        className="dropfiles-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />

      <p className="dropfiles-text">Drop your Spiti Memories</p>
      <div className="dropfiles-upload">
        <input
          type="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          id="fileInput"
          style={{ display: "none" }}
        />
        <label htmlFor="fileInput">
          <img
            src="/image/upload-icon.svg"
            alt="Upload"
            style={{ cursor: "pointer" }}
          />
        </label>
      </div>

      <button className="dropfiles-submit" onClick={uploadFile}>
        Upload
      </button>
      <ToastContainer />
      {showDashboard && <DropFilesDashboard />}
    </div>
  );
};

export default DropFiles;
