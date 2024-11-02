import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import axios from "axios";
import { toast } from "react-toastify";
import "./AvatarUpload.scss";

const AvatarUpload = ({ user, setUser, setIsCropMode, toggleEditAvatar }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result);
          setIsCropMode(true);
        };
        reader.readAsDataURL(file);
      }
    },
    [setIsCropMode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create a canvas with the cropped image
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

  // Handle save
  const handleSave = async () => {
    if (isUploading) return;

    try {
      setIsUploading(true);

      if (!imageSrc || !croppedAreaPixels) {
        toast.error("Please select and crop an image first");
        return;
      }

      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("profileImage", file);
      formData.append("userId", user._id);

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

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

      // Create a new date parameter to force browser to reload the image
      const timestamp = new Date().getTime();
      const newAvatarUrl = `${response.data.imageUrl}?t=${timestamp}`;

      // Update user object with timestamped URL
      setUser((prevUser) => ({
        ...prevUser,
        avatar: newAvatarUrl,
      }));

      setImageSrc(null);
      setIsCropMode(false);
      if (toggleEditAvatar) toggleEditAvatar();
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.error || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setImageSrc(null);
    setIsCropMode(false);
    if (toggleEditAvatar) toggleEditAvatar();
  };

  return (
    <div className="avatar-upload">
      {!user.avatar && !imageSrc ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "active" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            {isDragActive ? (
              <>
                <img src="/image/upload-icon.svg" alt="Upload" />
                <p>Drop image here</p>
              </>
            ) : (
              <>
                <img src="/image/profile-icon.svg" alt="Default profile" />
              </>
            )}
          </div>
        </div>
      ) : imageSrc ? (
        <>
          <div className="modal-overlay" onClick={handleCancel} />
          <div className="cropper-container">
            <div className="cropper-wrapper">
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

            <div className="controls">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="zoom-slider"
              />

              <div className="buttons">
                <button
                  onClick={handleCancel}
                  className="cancel-btn"
                  disabled={isUploading}
                >
                  <img src="/image/cancel-icon_w.svg" alt="Cancel" />
                </button>
                <button
                  onClick={handleSave}
                  className="save-btn"
                  disabled={isUploading}
                >
                  <img
                    src={
                      isUploading
                        ? "/image/loading-icon.svg"
                        : "/image/check-icon_w.svg"
                    }
                    alt={isUploading ? "Uploading..." : "Save"}
                    className={isUploading ? "rotating" : ""}
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Show existing avatar with edit overlay on hover
        <div className="avatar-display" onClick={() => setImageSrc(null)}>
          <img
            src={user.avatar}
            alt="Profile avatar"
            className="profile-image"
          />
          <div className="edit-overlay">
            <img src="/image/edit-icon.svg" alt="Edit" className="edit-icon" />
          </div>
        </div>
      )}

      {/* Online status indicator */}
      {user.online !== undefined && (
        <div
          className={`online-status-dot ${user.online ? "online" : "offline"}`}
        />
      )}
    </div>
  );
};
export default AvatarUpload;
