import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./VideoGallery.scss";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import {
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiLoader4Line,
  RiFilmLine,
} from "react-icons/ri";

const VideoGallery = ({
  videos = [],
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [videoLoading, setVideoLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { showSuccess, showError } = useToast();
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Cache for temporary links - persists across navigation
  const [linkCache, setLinkCache] = useState({});
  const fetchingRef = useRef(new Set());

  // Ref to access linkCache without triggering re-renders
  const linkCacheRef = useRef(linkCache);
  linkCacheRef.current = linkCache;

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Fetch temporary link for a video (returns direct Dropbox CDN URL)
  const fetchTempLink = useCallback(async (video) => {
    if (!video?.path) return null;

    const cacheKey = video.path;

    // Check cache first (use ref to avoid dependency)
    if (linkCacheRef.current[cacheKey]) {
      return linkCacheRef.current[cacheKey];
    }

    // Check if already fetching
    if (fetchingRef.current.has(cacheKey)) {
      return null;
    }

    fetchingRef.current.add(cacheKey);

    try {
      const response = await axiosInstance.get(
        `/dropbox/temp-link/${encodeURIComponent(video.path)}`
      );

      if (response.data?.success && response.data?.url) {
        const url = response.data.url;
        setLinkCache(prev => ({ ...prev, [cacheKey]: url }));
        fetchingRef.current.delete(cacheKey);
        return url;
      }
    } catch (err) {
      console.error("Failed to get temp link for video:", err);
      fetchingRef.current.delete(cacheKey);
    }

    return null;
  }, []); // No dependencies - uses refs

  // Preload next video link
  const preloadNextVideo = useCallback((centerIndex) => {
    const nextIndex = centerIndex + 1;
    if (nextIndex >= videos.length) return;

    const nextVideo = videos[nextIndex];
    if (!nextVideo?.path) return;

    const cacheKey = nextVideo.path;
    // Use ref to check cache without dependency
    if (linkCacheRef.current[cacheKey] || fetchingRef.current.has(cacheKey)) return;

    // Fetch in background
    fetchTempLink(nextVideo);
  }, [videos, fetchTempLink]);

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setVideoLoading(true);
      setVideoUrl(null);
      setIsPlaying(false);
    }
  }, [isOpen, initialIndex]);

  // Fetch video temp link when currentIndex changes
  useEffect(() => {
    if (!isOpen || videos.length === 0) return;

    const currentVideo = videos[currentIndex];
    if (!currentVideo?.path) {
      setVideoUrl(null);
      setVideoLoading(false);
      return;
    }

    const loadVideo = async () => {
      setIsPlaying(false);

      // Check cache first (use ref to avoid dependency loop)
      const cacheKey = currentVideo.path;
      const cachedUrl = linkCacheRef.current[cacheKey];

      if (cachedUrl) {
        // Already cached - set URL immediately
        setVideoUrl(cachedUrl);
        // Loading will be set to false by onLoadedData/onCanPlay
        return;
      }

      // Not cached - show loading and fetch
      setVideoLoading(true);
      const url = await fetchTempLink(currentVideo);
      if (url) {
        setVideoUrl(url);
      } else {
        setVideoUrl(null);
        setVideoLoading(false);
        showError("Failed to load video");
      }
    };

    loadVideo();
    preloadNextVideo(currentIndex);
  }, [isOpen, currentIndex, videos, fetchTempLink, preloadNextVideo, showError]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ": // Spacebar
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, videos.length]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : videos.length - 1;
    const prevVideo = videos[prevIndex];
    // Only show loading if not cached
    if (!prevVideo?.path || !linkCacheRef.current[prevVideo.path]) {
      setVideoLoading(true);
    }
    setVideoUrl(null); // Always clear current video
    setCurrentIndex(prevIndex);
  }, [currentIndex, videos]);

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex < videos.length - 1 ? currentIndex + 1 : 0;
    const nextVideo = videos[nextIndex];
    // Only show loading if not cached
    if (!nextVideo?.path || !linkCacheRef.current[nextVideo.path]) {
      setVideoLoading(true);
    }
    setVideoUrl(null); // Always clear current video
    setCurrentIndex(nextIndex);
  }, [currentIndex, videos]);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Download handler - uses temp link for faster download
  const handleDownload = async () => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo?.path) {
      showError("Unable to download video");
      return;
    }

    try {
      setDownloading(true);

      // Get or use cached temp link (use ref)
      let downloadUrl = linkCacheRef.current[currentVideo.path];
      if (!downloadUrl) {
        const response = await axiosInstance.get(
          `/dropbox/temp-link/${encodeURIComponent(currentVideo.path)}`
        );
        if (response.data?.success && response.data?.url) {
          downloadUrl = response.data.url;
        }
      }

      if (downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = currentVideo.name || "video.mp4";
        link.target = "_blank"; // Open in new tab as Dropbox links may require it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess("Download started");
      } else {
        showError("Failed to get download link");
      }
    } catch (error) {
      console.error("Download failed:", error);
      showError("Failed to download video");
    } finally {
      setDownloading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  const handleVideoLoad = () => {
    setVideoLoading(false);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  if (!isOpen || videos.length === 0) return null;

  const currentVideo = videos[currentIndex];

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="video-lightbox-overlay"
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close Button */}
        <button className="video-lightbox-close" onClick={onClose}>
          <RiCloseLine />
        </button>

        {/* Navigation - Previous */}
        {videos.length > 1 && (
          <button
            className="video-lightbox-nav video-lightbox-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <RiArrowLeftSLine />
          </button>
        )}

        {/* Video Container */}
        <div className="video-lightbox-container">
          {/* Loading spinner */}
          {videoLoading && (
            <div className="video-lightbox-loading">
              <RiLoader4Line className="spinner" />
              <span className="loading-text">Loading video...</span>
            </div>
          )}

          {/* Video Player - uses direct Dropbox CDN URL for streaming */}
          {videoUrl && (
            <motion.div
              className="video-player-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: videoLoading ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="video-player"
                controls
                playsInline
                preload="auto"
                onLoadedData={handleVideoLoad}
                onCanPlay={handleVideoLoad}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onError={(e) => {
                  console.error("Video error:", e);
                  setVideoLoading(false);
                  showError("Failed to play video");
                }}
              />
            </motion.div>
          )}

          {/* Placeholder when no video */}
          {!videoUrl && !videoLoading && (
            <div className="video-lightbox-placeholder">
              <RiFilmLine />
              <p>Video not available</p>
            </div>
          )}
        </div>

        {/* Navigation - Next */}
        {videos.length > 1 && (
          <button
            className="video-lightbox-nav video-lightbox-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <RiArrowRightSLine />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="video-lightbox-controls">
          <span className="video-lightbox-counter">
            {currentIndex + 1} / {videos.length}
          </span>

          <span className="video-lightbox-name" title={currentVideo?.name}>
            {currentVideo?.name}
          </span>

          <button
            className="video-lightbox-download"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <RiLoader4Line className="spinner" />
            ) : (
              <RiDownloadLine />
            )}
            <span>Download</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default VideoGallery;
