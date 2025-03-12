import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import axios from "axios";
import { toast } from "react-toastify";
import "./AvatarUpload.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiUpload2Line,
  RiCloseLine,
  RiCheckLine,
  RiEditLine,
} from "react-icons/ri";
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
  const [showModal, setShowModal] = useState(isCropMode);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    setShowModal(isCropMode);
  }, [isCropMode]);

  useEffect(() => {
    if (setIsCropMode && !showModal && isCropMode) {
      setIsCropMode(false);
    }
  }, [showModal, isCropMode, setIsCropMode]);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user]);

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

      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      if (isLineUpMode && onImageCropped) {
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
        throw new Error("No authentication token found");
      }

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

      setUser((prevUser) => ({
        ...prevUser,
        avatar: response.data.imageUrl,
      }));

      // Reset image error state after successful upload
      setImageError(false);
      setImageSrc(null);
      setShowModal(false);
      showSuccess("Avatar updated successfully!");
    } catch (error) {
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

  const handleImageError = () => {
    setImageError(true);
  };

  const isValidAvatarUrl = () => {
    const avatarUrl = getAvatarUrl(user?.avatar);

    // Check if the URL contains the old S3 pattern that's known to be broken
    if (
      avatarUrl &&
      avatarUrl.includes("guest-code.s3.eu-north-1.amazonaws.com/avatars/")
    ) {
      return false;
    }

    return !imageError && avatarUrl;
  };

  const renderModal = () => {
    if (!showModal) {
      return null;
    }

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
                    max={5}
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
            setShowModal(true);
            if (setIsCropMode) {
              setIsCropMode(true);
            }
          }}
        >
          {isValidAvatarUrl() ? (
            <img
              src={getAvatarUrl(user.avatar)}
              alt="User avatar"
              className="avatar-image"
              onError={handleImageError}
            />
          ) : (
            <div className="avatar-placeholder">
              <RiUpload2Line className="upload-icon" />
            </div>
          )}
          <div className="avatar-overlay">
            <RiEditLine className="edit-icon" />
          </div>
        </div>
      </div>
      {renderModal()}
    </>
  );
};

export default AvatarUpload;
