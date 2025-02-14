import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./DashboardFeed.scss";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import {
  RiCloseLine,
  RiArrowUpLine,
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiMusic2Line,
  RiRefreshLine,
} from "react-icons/ri";

const DashboardFeed = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Simulating API call - replace with actual API call
        const data = {
          title: "Afro Spiti",
          date: "Sunday, March 24",
          time: "23:00 - 05:00",
          location: "Studio 24, Athens",
          lineup: ["Deeze (Cyprus)", "Baghdad", "Hulk"],
          description:
            "Join us for another amazing night of Afrobeats, Amapiano & Dancehall",
          image: "/pageContent/header/header.png",
        };
        setEventData(data);

        const img = new Image();
        img.src = data.image;
        img.onload = () => setImageLoaded(true);
        img.onerror = () => {
          setImageLoaded(false);
          throw new Error("Failed to load event image");
        };
      } catch (err) {
        setError(err.message);
        console.error("Error fetching event data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, []);

  const handleRetry = () => {
    setImageLoaded(false);
    setEventData(null);
    setError(null);
    // Re-fetch data
    const img = new Image();
    img.src = eventData?.image;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);
  };

  if (isLoading) {
    return (
      <div className="dashboard-feed loading">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-feed error">
        <div className="error-content">
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            <RiRefreshLine /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="dashboard-feed empty">
        <p>No event data available</p>
      </div>
    );
  }

  return (
    <div className={`dashboard-feed ${isCollapsed ? "collapsed" : ""}`}>
      {/* Flyer Section */}
      <AnimatePresence>
        {!isCollapsed ? (
          <motion.div
            className="flyer-item"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="feed-item-inner"
              style={
                imageLoaded
                  ? {
                      backgroundImage: `url(${eventData.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {
                      background: "linear-gradient(145deg, #ffc807, #d1a300)",
                    }
              }
            >
              <div
                className="close-button"
                onClick={() => setIsCollapsed(true)}
              >
                <RiCloseLine />
              </div>
              {!imageLoaded && (
                <div className="flyer-content">
                  <h2>{eventData.title}</h2>
                  <p>{eventData.date}</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="collapsed-strip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCollapsed(false)}
          >
            <RiArrowUpLine />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Info Grid */}
      <div className="info-grid">
        <div className="info-item">
          <div className="info-icon">
            <RiCalendarEventLine />
          </div>
          <div className="info-content">
            <h3>Next Event</h3>
            <p>{eventData.date}</p>
            <p>{eventData.time}</p>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <RiMapPinLine />
          </div>
          <div className="info-content">
            <h3>Location</h3>
            <p>{eventData.location}</p>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <RiMusic2Line />
          </div>
          <div className="info-content">
            <h3>Line Up</h3>
            <div className="lineup-list">
              {eventData.lineup.map((artist, index) => (
                <p key={index}>{artist}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <RiTimeLine />
          </div>
          <div className="info-content">
            <h3>Info</h3>
            <p>{eventData.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFeed;
