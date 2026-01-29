import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiUpload2Line,
  RiVideoLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiUserLine,
  RiMailLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./MediaUpload.scss";

/**
 * MediaUpload Component
 *
 * A reusable component for uploading videos to Dropbox via the brand's configured upload folder.
 *
 * Props:
 * - brandId (required): The brand's ID
 * - eventId (optional): Links upload to a specific event
 * - mode: "team" (authenticated users) or "public" (guests)
 * - onUploadComplete: Callback when upload succeeds
 * - onClose: Callback to close the upload modal
 */
const MediaUpload = ({
  brandId,
  eventId = null,
  mode = "public",
  onUploadComplete = () => {},
  onClose = () => {},
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState(null);

  // For public mode - guest information
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");

  const fileInputRef = useRef(null);
  const { showSuccess, showError } = useToast();

  // File validation
  const validateFile = (file) => {
    const allowedTypes = [
      // Videos
      "video/mp4", "video/quicktime", "video/webm",
      // Photos
      "image/jpeg", "image/png", "image/gif", "image/webp"
    ];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.type)) {
      return "Only MP4, MOV, WebM, JPEG, PNG, GIF, and WebP files are allowed.";
    }

    if (file.size > maxSize) {
      return "File too large. Maximum size is 100MB.";
    }

    return null;
  };

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        showError(validationError);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }, [showError]);

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        showError(validationError);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // Handle file selection via button click
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    if (mode === "public" && !uploaderName.trim()) {
      setError("Please enter your name");
      showError("Please enter your name");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("media", selectedFile);
    formData.append("brandId", brandId);
    formData.append("uploaderType", mode === "team" ? "team" : "guest");
    formData.append("uploaderName", uploaderName.trim() || "Team Member");

    if (eventId) {
      formData.append("eventId", eventId);
    }

    if (uploaderEmail.trim()) {
      formData.append("uploaderEmail", uploaderEmail.trim());
    }

    try {
      const response = await axiosInstance.post("/dropbox/guest-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        setUploadComplete(true);
        showSuccess("Media uploaded successfully!");
        onUploadComplete(response.data.upload);

        // Reset after a short delay
        setTimeout(() => {
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadComplete(false);
          setUploaderName("");
          setUploaderEmail("");
        }, 2000);
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to upload video";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="media-upload-container">
      <div className="media-upload-header">
        <h3>
          <RiVideoLine />
          {mode === "team" ? "Upload Video" : "Share Your Moments"}
        </h3>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <RiCloseLine />
        </button>
      </div>

      <div className="media-upload-content">
        {/* Guest information fields (public mode only) */}
        {mode === "public" && (
          <div className="uploader-info">
            <div className="input-group">
              <label htmlFor="uploaderName">
                <RiUserLine />
                Your Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="uploaderName"
                placeholder="Enter your name"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                disabled={uploading}
                maxLength={50}
              />
            </div>
            <div className="input-group">
              <label htmlFor="uploaderEmail">
                <RiMailLine />
                Email <span className="optional">(optional)</span>
              </label>
              <input
                type="email"
                id="uploaderEmail"
                placeholder="Enter your email"
                value={uploaderEmail}
                onChange={(e) => setUploaderEmail(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`drop-zone ${isDragging ? "dragging" : ""} ${
            selectedFile ? "has-file" : ""
          } ${uploadComplete ? "complete" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!selectedFile ? handleSelectFile : undefined}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/gif,image/webp"
            hidden
          />

          <AnimatePresence mode="wait">
            {uploadComplete ? (
              <motion.div
                key="complete"
                className="upload-state complete-state"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div className="success-icon">
                  <RiCheckLine />
                </div>
                <p>Upload Complete!</p>
              </motion.div>
            ) : selectedFile ? (
              <motion.div
                key="file"
                className="upload-state file-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="file-info">
                  <RiVideoLine className="file-icon" />
                  <div className="file-details">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                  {!uploading && (
                    <button
                      className="remove-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      aria-label="Remove file"
                    >
                      <RiCloseLine />
                    </button>
                  )}
                </div>

                {uploading && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="progress-text">{uploadProgress}%</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="upload-state empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="upload-icon">
                  <RiUpload2Line />
                </div>
                <p className="upload-text">
                  Drag and drop your video here
                </p>
                <p className="upload-subtext">
                  or click to select a file
                </p>
                <p className="upload-hint">
                  MP4, MOV, WebM, JPEG, PNG, GIF, WebP (max 100MB)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RiErrorWarningLine />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="action-buttons">
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={!selectedFile || uploading || uploadComplete}
          >
            {uploading ? (
              <>
                <span className="spinner" />
                Uploading...
              </>
            ) : (
              <>
                <RiUpload2Line />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;
