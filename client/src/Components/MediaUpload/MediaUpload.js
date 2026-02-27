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
  RiImageLine,
  RiAddLine,
  RiDeleteBinLine,
} from "react-icons/ri";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./MediaUpload.scss";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "video/mp4", "video/quicktime", "video/webm",
  "image/jpeg", "image/png", "image/gif", "image/webp",
];

const FILE_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  DONE: "done",
  ERROR: "error",
};

const MediaUpload = ({
  brandId,
  eventId = null,
  mode = "public",
  onUploadComplete = () => {},
  onClose = () => {},
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]); // { file, status, progress, error, id }
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [allDone, setAllDone] = useState(false);
  const [error, setError] = useState(null);

  // For public mode - guest information
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");

  const fileInputRef = useRef(null);
  const addMoreInputRef = useRef(null);
  const uploadStartTimeRef = useRef(null);
  const abortRef = useRef(false);
  const { showSuccess, showError } = useToast();

  // Validate a single file
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only MP4, MOV, WebM, JPEG, PNG, GIF, and WebP files are allowed.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 100MB.";
    }
    return null;
  };

  // Add files to the queue
  const addFiles = useCallback((newFiles) => {
    setError(null);
    const fileArray = Array.from(newFiles);
    const currentCount = files.length;
    const remaining = MAX_FILES - currentCount;

    if (remaining <= 0) {
      showError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    const toAdd = fileArray.slice(0, remaining);
    if (fileArray.length > remaining) {
      showError(`Only ${remaining} more file${remaining !== 1 ? "s" : ""} can be added. (Max ${MAX_FILES})`);
    }

    const validFiles = [];
    for (const file of toAdd) {
      const err = validateFile(file);
      if (err) {
        showError(`${file.name}: ${err}`);
      } else {
        validFiles.push({
          file,
          status: FILE_STATUS.PENDING,
          progress: 0,
          error: null,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        });
      }
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setAllDone(false);
    }
  }, [files.length, showError]);

  // Drag handlers
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
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // File input change
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleSelectFile = () => fileInputRef.current?.click();
  const handleAddMore = () => addMoreInputRef.current?.click();

  // Remove a file from the queue
  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Clear all files
  const handleClearAll = () => {
    setFiles([]);
    setAllDone(false);
    setError(null);
    setCurrentFileIndex(-1);
  };

  // Upload one file
  const uploadSingleFile = async (fileEntry, index) => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append("media", fileEntry.file);
      formData.append("brandId", brandId);
      formData.append("uploaderType", mode === "team" ? "team" : "guest");
      formData.append("uploaderName", uploaderName.trim() || "Team Member");
      if (eventId) formData.append("eventId", eventId);
      if (uploaderEmail.trim()) formData.append("uploaderEmail", uploaderEmail.trim());

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileEntry.id ? { ...f, status: FILE_STATUS.UPLOADING, progress: 0 } : f
        )
      );
      setCurrentFileIndex(index);

      axiosInstance
        .post("/dropbox/guest-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 600000,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id ? { ...f, progress } : f
              )
            );
          },
        })
        .then((response) => {
          if (response.data.success) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id
                  ? { ...f, status: FILE_STATUS.DONE, progress: 100 }
                  : f
              )
            );
            resolve(true);
          } else {
            throw new Error(response.data.message || "Upload failed");
          }
        })
        .catch((err) => {
          const errorMsg = err.response?.data?.message || err.message || "Upload failed";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileEntry.id
                ? { ...f, status: FILE_STATUS.ERROR, error: errorMsg }
                : f
            )
          );
          resolve(false);
        });
    });
  };

  // Handle sequential upload of all files
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    if (mode === "public" && !uploaderName.trim()) {
      setError("Please enter your name");
      showError("Please enter your name");
      return;
    }

    const pendingFiles = files.filter((f) => f.status === FILE_STATUS.PENDING);
    if (pendingFiles.length === 0) {
      setError("No pending files to upload");
      return;
    }

    setUploading(true);
    setError(null);
    setAllDone(false);
    abortRef.current = false;
    uploadStartTimeRef.current = Date.now();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;

      const fileEntry = files[i];
      if (fileEntry.status !== FILE_STATUS.PENDING) {
        if (fileEntry.status === FILE_STATUS.DONE) successCount++;
        if (fileEntry.status === FILE_STATUS.ERROR) failCount++;
        continue;
      }

      const result = await uploadSingleFile(fileEntry, i);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setUploading(false);
    setCurrentFileIndex(-1);
    setAllDone(true);

    if (successCount > 0 && failCount === 0) {
      showSuccess(`${successCount} file${successCount !== 1 ? "s" : ""} uploaded successfully!`);
      onUploadComplete();
    } else if (successCount > 0 && failCount > 0) {
      showSuccess(`${successCount} uploaded, ${failCount} failed.`);
    } else if (failCount > 0) {
      showError(`All ${failCount} uploads failed.`);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Check if file is an image
  const isImage = (file) => file.type.startsWith("image/");

  // Get file icon
  const getFileIcon = (file) => {
    return isImage(file) ? <RiImageLine /> : <RiVideoLine />;
  };

  // Summary counts
  const pendingCount = files.filter((f) => f.status === FILE_STATUS.PENDING).length;
  const doneCount = files.filter((f) => f.status === FILE_STATUS.DONE).length;
  const errorCount = files.filter((f) => f.status === FILE_STATUS.ERROR).length;
  const hasFiles = files.length > 0;

  return (
    <div className="media-upload-container">
      <div className="media-upload-header">
        <h3>
          <RiUpload2Line />
          {mode === "team" ? "Upload Media" : "Share Your Moments"}
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

        {/* Overall progress when uploading */}
        {uploading && (
          <div className="upload-overall-progress">
            <div className="overall-progress-text">
              Uploading {currentFileIndex + 1} of {files.length}...
            </div>
            <div className="overall-progress-bar">
              <motion.div
                className="overall-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${((doneCount + (files[currentFileIndex]?.progress || 0) / 100) / files.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* All done summary */}
        {allDone && !uploading && (
          <motion.div
            className="upload-summary"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errorCount === 0 ? (
              <div className="summary-success">
                <RiCheckLine />
                <span>{doneCount} file{doneCount !== 1 ? "s" : ""} uploaded successfully!</span>
              </div>
            ) : (
              <div className="summary-mixed">
                <span>{doneCount} uploaded, {errorCount} failed</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Drop zone - compact when files are selected */}
        <div
          className={`drop-zone ${isDragging ? "dragging" : ""} ${hasFiles ? "compact" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!hasFiles ? handleSelectFile : undefined}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/gif,image/webp"
            multiple
            hidden
          />
          <input
            type="file"
            ref={addMoreInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/gif,image/webp"
            multiple
            hidden
          />

          {!hasFiles && (
            <div className="upload-state empty-state">
              <div className="upload-icon">
                <RiUpload2Line />
              </div>
              <p className="upload-text">Drag and drop your files here</p>
              <p className="upload-subtext">or click to select</p>
              <p className="upload-hint">
                Photos & Videos up to 100MB each (max {MAX_FILES} files)
              </p>
            </div>
          )}

          {hasFiles && (
            <div className="upload-state compact-state" onClick={handleAddMore}>
              <RiAddLine />
              <span>Add more files</span>
              <span className="file-count">{files.length}/{MAX_FILES}</span>
            </div>
          )}
        </div>

        {/* File queue */}
        {hasFiles && (
          <div className="file-queue">
            {files.map((entry) => (
              <div
                key={entry.id}
                className={`file-queue-item ${entry.status}`}
              >
                <div className="file-queue-item-icon">
                  {entry.status === FILE_STATUS.DONE ? (
                    <RiCheckLine className="status-done" />
                  ) : entry.status === FILE_STATUS.ERROR ? (
                    <RiErrorWarningLine className="status-error" />
                  ) : (
                    getFileIcon(entry.file)
                  )}
                </div>

                <div className="file-queue-item-info">
                  <span className="file-queue-item-name">{entry.file.name}</span>
                  <span className="file-queue-item-size">
                    {formatFileSize(entry.file.size)}
                    {entry.status === FILE_STATUS.ERROR && entry.error && (
                      <span className="file-queue-item-error"> - {entry.error}</span>
                    )}
                  </span>
                </div>

                {/* Per-file progress */}
                {entry.status === FILE_STATUS.UPLOADING && (
                  <div className="file-queue-item-progress">
                    <div className="mini-progress-bar">
                      <motion.div
                        className="mini-progress-fill"
                        animate={{ width: `${entry.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <span className="mini-progress-text">{entry.progress}%</span>
                  </div>
                )}

                {/* Remove button (only when not uploading) */}
                {!uploading && entry.status !== FILE_STATUS.DONE && (
                  <button
                    className="file-queue-item-remove"
                    onClick={() => handleRemoveFile(entry.id)}
                    aria-label="Remove file"
                  >
                    <RiCloseLine />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
          {hasFiles && !uploading && (
            <button
              className="clear-btn"
              onClick={handleClearAll}
            >
              <RiDeleteBinLine />
              Clear All
            </button>
          )}
          <button
            className="cancel-btn"
            onClick={onClose}
            disabled={uploading}
          >
            {allDone ? "Close" : "Cancel"}
          </button>
          {pendingCount > 0 && (
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? (
                <>
                  <span className="spinner" />
                  Uploading...
                </>
              ) : (
                <>
                  <RiUpload2Line />
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;
