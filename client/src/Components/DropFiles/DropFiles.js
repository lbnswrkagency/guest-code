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
  const [uploadProgress, setUploadProgress] = useState(0);

  const navigate = useNavigate();
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };
  const uploadFile = async () => {
    if (!file) {
      toast.error("Please select a file before uploading.");
      return;
    }

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
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      toast.dismiss(loadingToast);
      toast.info("Upload complete, processing now...");

      // Simulate processing delay
      setTimeout(() => {
        toast.success("Upload successful!");
      }, 2000); // Adjust time based on your processing time estimation
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Upload failed. Please try again.");
    } finally {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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

      <img className="dropfiles-logo" src="public/limage/logo.svg" alt="" />

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
            className={`${!file ? "pulse" : ""}`}
          />
        </label>
      </div>

      <button
        className={`dropfiles-submit ${file ? "pulse" : ""}`}
        onClick={uploadFile}
      >
        Upload
      </button>
      <ToastContainer />

      {showDashboard && <DropFilesDashboard />}
    </div>
  );
};

export default DropFiles;
