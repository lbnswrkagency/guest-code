import React, { useState, useEffect } from "react";
import "./ProgressiveImage.scss";

const ProgressiveImage = ({
  thumbnailSrc,
  mediumSrc,
  fullSrc,
  alt,
  className,
  blurPlaceholder,
  onLoad,
}) => {
  const [currentSrc, setCurrentSrc] = useState(blurPlaceholder);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset states when sources change
    setLoading(true);
    setError(false);

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = reject;
      });
    };

    const loadImages = async () => {
      try {
        // Start with blur placeholder
        if (blurPlaceholder) {
          setCurrentSrc(blurPlaceholder);
        }

        // Load thumbnail
        if (thumbnailSrc) {
          await loadImage(thumbnailSrc);
          setCurrentSrc(thumbnailSrc);
        }

        // Load medium resolution
        if (mediumSrc) {
          await loadImage(mediumSrc);
          setCurrentSrc(mediumSrc);
        }

        // Load full resolution
        if (fullSrc) {
          await loadImage(fullSrc);
          setCurrentSrc(fullSrc);
        }

        setLoading(false);
        if (onLoad) onLoad();
      } catch (err) {
        console.error("Error loading image:", err);
        setError(true);
        setLoading(false);
      }
    };

    loadImages();
  }, [thumbnailSrc, mediumSrc, fullSrc, blurPlaceholder, onLoad]);

  return (
    <div
      className={`progressive-image ${className || ""} ${
        loading ? "loading" : ""
      }`}
    >
      {error ? (
        <div className="error">Failed to load image</div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          className={loading ? "blur" : ""}
          style={{
            transition: "filter 0.3s ease-out",
          }}
        />
      )}
    </div>
  );
};

export default ProgressiveImage;
