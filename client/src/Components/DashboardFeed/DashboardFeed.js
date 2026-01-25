import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import "./DashboardFeed.scss";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { RiInformationLine, RiRefreshLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import UpcomingEvent from "../UpcomingEvent/UpcomingEvent";
import axiosInstance from "../../utils/axiosConfig";

const DashboardFeed = ({ selectedBrand, selectedDate, selectedEvent }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);

  // State for fresh events data from API
  const [freshEvents, setFreshEvents] = useState([]);
  const [lastFetchedBrandId, setLastFetchedBrandId] = useState(null);

  // Fetch fresh event data from API when brand changes
  const fetchFreshEventData = useCallback(
    async (brandId) => {
      if (!brandId) return;

      // Skip if we already fetched for this brand
      if (brandId === lastFetchedBrandId && freshEvents.length > 0) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get(
          `${process.env.REACT_APP_API_BASE_URL}/all/upcoming-event-data?brandId=${brandId}`,
        );

        if (response.data?.success && response.data?.data?.events) {
          const events = response.data.data.events;
          setFreshEvents(events);
          setLastFetchedBrandId(brandId);
        } else {
          // Fallback: try the brand events endpoint
          const fallbackResponse = await axiosInstance.get(
            `${process.env.REACT_APP_API_BASE_URL}/events/brand/${brandId}`,
          );

          if (Array.isArray(fallbackResponse.data)) {
            setFreshEvents(fallbackResponse.data);
            setLastFetchedBrandId(brandId);
          } else {
            setFreshEvents([]);
          }
        }
      } catch (err) {
        console.error("[DashboardFeed] Error fetching fresh events:", err);
        // On error, we'll fall back to Redux data via selectedEvent
        setFreshEvents([]);
        setError(null); // Don't show error, just use fallback
      } finally {
        setIsLoading(false);
      }
    },
    [lastFetchedBrandId, freshEvents.length],
  );

  // Fetch fresh data when brand changes
  useEffect(() => {
    if (selectedBrand?._id) {
      fetchFreshEventData(selectedBrand._id);
    }
  }, [selectedBrand?._id, fetchFreshEventData]);

  // Find the correct event from fresh data or fall back to Redux
  useEffect(() => {
    if (isLoading) return;

    // Helper function to find the next upcoming event from fresh data
    const findNextUpcomingFromFresh = () => {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      // Find the first upcoming or active event
      const upcomingEvent = freshEvents.find((event) => {
        if (!event.startDate) return false;
        const eventDate = new Date(event.startDate);
        return eventDate >= startOfToday;
      });

      return upcomingEvent || freshEvents[0] || null;
    };

    // PRIORITY 1: Always use fresh API data when available
    if (freshEvents.length > 0) {
      // Try to find event matching selectedDate
      if (selectedDate) {
        const formattedDate = new Date(selectedDate)
          .toISOString()
          .split("T")[0];

        const matchingEvent = freshEvents.find((event) => {
          if (!event.startDate) return false;
          const eventDateStr = new Date(event.startDate)
            .toISOString()
            .split("T")[0];
          return eventDateStr === formattedDate;
        });

        if (matchingEvent) {
          setEventData(matchingEvent);
          return;
        } else {
        }
      }

      // selectedDate doesn't match any fresh event OR no date selected
      // Find the actual next upcoming event from fresh data
      // This handles stale selectedDate from Redux
      const nextUpcoming = findNextUpcomingFromFresh();
      if (nextUpcoming) {
        console.log(
          "[DashboardFeed] Using next upcoming event:",
          nextUpcoming.title,
          nextUpcoming._id,
        );
        setEventData(nextUpcoming);
        return;
      }
    }

    // FALLBACK: Only use Redux selectedEvent if we have NO fresh data
    if (selectedEvent) {
      setEventData(selectedEvent);
      return;
    }

    // No event data available
    setEventData(null);
  }, [freshEvents, selectedDate, selectedEvent, isLoading]);

  // Handle retry
  const handleRetry = () => {
    setLastFetchedBrandId(null); // Reset to force refetch
    if (selectedBrand?._id) {
      fetchFreshEventData(selectedBrand._id);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboardFeed-container dashboardFeed-loading">
        <LoadingSpinner size="large" color="primary" />
        <p>Loading event information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboardFeed-container dashboardFeed-error">
        <div className="dashboardFeed-error-content">
          <RiInformationLine size={48} />
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={handleRetry} className="dashboardFeed-retry-button">
            <RiRefreshLine /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="dashboardFeed-container dashboardFeed-empty">
        <div className="dashboardFeed-empty-content">
          <motion.div
            className="empty-state-message"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="empty-state-title">
              {user?.isAlpha
                ? "Join or Create Events, to start your journey."
                : "Join Events, to start your journey."}
            </h2>
            <p className="empty-state-subtitle">
              Discover amazing experiences waiting for you
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Use UpcomingEvent component to display the selected event
  return (
    <div className="dashboardFeed-container">
      {/* Minimal co-hosting indicator */}
      {eventData?.coHostBrandInfo && (
        <div className="co-hosting-indicator">
          <span className="co-hosting-badge">Co-hosting</span>
        </div>
      )}

      <div className="dashboardFeed-content">
        <UpcomingEvent
          key={`${selectedBrand?._id}-${eventData?._id}`}
          brandId={selectedBrand?._id}
          brandUsername={selectedBrand?.username}
          seamless={true}
          events={[eventData]} // Pass as an array with a single event
          initialEventIndex={0}
          hideNavigation={true} // Hide the navigation controls
          hideTableBooking={true} // Hide the table booking section in Dashboard
        />
      </div>
    </div>
  );
};

export default DashboardFeed;
