import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import axios from "axios";
import { toast } from "react-toastify";
import "./AvatarUpload.scss";
import { motion, AnimatePresence } from "framer-motion";
import { RiUpload2Line, RiCloseLine, RiCheckLine } from "react-icons/ri";
import { createPortal } from "react-dom";
import { useToast } from "../Toast/ToastContext";

const AvatarUpload = ({
  user,
  setUser,
  isCropMode,
  setIsCropMode,
  onImageCropped,
  isLineUpMode = false,
}) => {
  console.log("[AvatarUpload] Component rendered with props:", {
    user: user ? { id: user._id, hasAvatar: !!user.avatar } : null,
    isCropMode,
    isLineUpMode,
  });

  const [showModal, setShowModal] = useState(isCropMode);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    console.log(
      "[AvatarUpload] isCropMode effect triggered, value:",
      isCropMode
    );
    setShowModal(isCropMode);
  }, [isCropMode]);

  useEffect(() => {
    console.log(
      "[AvatarUpload] showModal effect triggered, value:",
      showModal,
      "isCropMode:",
      isCropMode
    );
    if (setIsCropMode && !showModal && isCropMode) {
      setIsCropMode(false);
    }
  }, [showModal, isCropMode, setIsCropMode]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (isUploading) return;

    try {
      setIsUploading(true);

      if (!imageSrc || !croppedAreaPixels) {
        showError("Please select and crop an image first");
        setIsUploading(false);
        return;
      }

      console.log("[AvatarUpload] Starting save process:", {
        userId: user?._id,
        hasCroppedPixels: !!croppedAreaPixels,
        isLineUpMode,
        timestamp: new Date().toISOString(),
      });

      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      if (isLineUpMode && onImageCropped) {
        console.log("[AvatarUpload] In LineUp mode, returning cropped file");
        onImageCropped(file);
        setImageSrc(null);
        setShowModal(false);
        if (setIsCropMode) setIsCropMode(false);
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("profileImage", file);

      if (user && user._id) {
        formData.append("userId", user._id);
      } else {
        throw new Error("User ID is required for avatar upload");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("[AvatarUpload] No authentication token found");
        throw new Error("No authentication token found");
      }

      console.log("[AvatarUpload] Sending upload request:", {
        hasToken: !!token,
        tokenStart: token.substring(0, 20) + "...",
        userId: user._id,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/avatar/profile-img-upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("[AvatarUpload] Upload response received:", {
        status: response.status,
        hasImageUrl: !!response.data.imageUrl,
        timestamp: new Date().toISOString(),
      });

      setUser((prevUser) => ({
        ...prevUser,
        avatar: response.data.imageUrl,
      }));

      setImageSrc(null);
      setShowModal(false);
      showSuccess("Avatar updated successfully!");
    } catch (error) {
      console.error("[AvatarUpload] Upload error:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      showError(error.response?.data?.error || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setShowModal(false);
    if (setIsCropMode) setIsCropMode(false);
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar === "string") return avatar;
    return avatar.medium || avatar.full || avatar.thumbnail;
  };

  const renderModal = () => {
    console.log("[AvatarUpload] renderModal called, showModal:", showModal);
    if (!showModal) {
      console.log("[AvatarUpload] Not showing modal - showModal is false");
      return null;
    }

    console.log("[AvatarUpload] Rendering modal portal");
    return createPortal(
      <AnimatePresence>
        <motion.div
          className="avatar-modal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="avatar-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          <motion.div
            className="avatar-modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {!imageSrc ? (
              <div
                {...getRootProps()}
                className={`upload-dropzone ${isDragActive ? "active" : ""}`}
                style={{ zIndex: 9999 }}
              >
                <input {...getInputProps()} />
                <RiUpload2Line className="upload-icon" />
                <p className="upload-text">
                  {isDragActive
                    ? "Drop your image here"
                    : "Click or drag image to upload"}
                </p>
                <p className="upload-hint">Supports JPG, PNG (max. 5MB)</p>
              </div>
            ) : (
              <div className="crop-container">
                <div className="crop-area">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>

                <div className="crop-controls">
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                  />

                  <div className="action-buttons">
                    <button
                      onClick={handleCancel}
                      className="cancel-button"
                      disabled={isUploading}
                    >
                      <RiCloseLine />
                    </button>
                    <button
                      onClick={handleSave}
                      className="save-button"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="loading-spinner" />
                      ) : (
                        <RiCheckLine />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <>
      <div className={`avatar-upload ${isLineUpMode ? "lineup-mode" : ""}`}>
        <div
          className="avatar-display"
          onClick={() => {
            console.log(
              "[AvatarUpload] Avatar display clicked, setting showModal=true"
            );
            setShowModal(true);
            if (setIsCropMode) {
              console.log("[AvatarUpload] Also setting isCropMode=true");
              setIsCropMode(true);
            }
          }}
        >
          {user?.avatar ? (
            <img
              src={getAvatarUrl(user.avatar)}
              alt="User avatar"
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {isLineUpMode ? (
                <RiUpload2Line className="upload-icon" />
              ) : (
                <img src="/image/profile-icon.svg" alt="Default profile" />
              )}
            </div>
          )}
          <div className="avatar-overlay">
            <img src="/image/edit-icon.svg" alt="Edit" className="edit-icon" />
          </div>
        </div>
      </div>
      {renderModal()}
    </>
  );
};

export default AvatarUpload;
