// DashboardHeader.js
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiMoreLine,
} from "react-icons/ri";
import "./DashboardHeader.scss";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import OnlineIndicator from "../OnlineIndicator/OnlineIndicator";
import CurrentEvents from "../CurrentEvents/CurrentEvents";

const DashboardHeader = ({
  user,
  brandsCount,
  eventsCount,
  brands,
  selectedBrand: propSelectedBrand,
  setSelectedBrand: propSetSelectedBrand,
  selectedDate: propSelectedDate,
  setSelectedDate: propSetSelectedDate,
}) => {
  // UI State
  const [isCropMode, setIsCropMode] = useState(false);
  const [brandDropdown, setBrandDropdown] = useState(false);
  const [dateDropdown, setDateDropdown] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(
    propSelectedBrand || brands?.[0] || null
  );
  const [selectedDate, setSelectedDate] = useState(propSelectedDate || null);
  const [currentUser, setCurrentUser] = useState(user);

  // Update local state when props change
  useEffect(() => {
    if (propSelectedBrand) {
      setSelectedBrand(propSelectedBrand);
    }
  }, [propSelectedBrand]);

  useEffect(() => {
    setSelectedDate(propSelectedDate);
  }, [propSelectedDate]);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dashboardHeader-event")) {
        setBrandDropdown(false);
      }
      if (!e.target.closest(".dashboardHeader-date")) {
        setDateDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set initial selected brand when brands are loaded
  useEffect(() => {
    if (brands && brands.length > 0 && !selectedBrand) {
      const initialBrand = brands[0];
      setSelectedBrand(initialBrand);
      if (propSetSelectedBrand) {
        propSetSelectedBrand(initialBrand);
      }
    }
  }, [brands, selectedBrand, propSetSelectedBrand]);


  // Update currentUser when user prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Get display name (firstName or username)
  const displayName = user?.firstName || user?.username || "User";
  const username = user?.username || "username";

  // Get user role from the selected brand - properly capitalize (first letter uppercase, rest lowercase)
  const formatRole = (roleName) => {
    if (!roleName) return "";
    return roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
  };

  const userRole = formatRole(selectedBrand?.role?.name);

  // Handle brand selection
  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setBrandDropdown(false);

    // Reset the selected date to null when switching brands
    // This will trigger the parent component to find the next upcoming event
    setSelectedDate(null);
    if (propSetSelectedDate) {
      propSetSelectedDate(null);
    }

    // Call parent component's setter if provided
    // The parent will handle finding the next upcoming event
    if (propSetSelectedBrand) {
      propSetSelectedBrand(brand);
    }
  };

  // Handle date selection
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setDateDropdown(false);

    // Call parent component's setter if provided
    if (propSetSelectedDate) {
      propSetSelectedDate(date);
    }
  };

  // Helper function to render brand logo or initial
  const renderBrandLogo = (brand) => {
    if (brand?.logo?.medium || brand?.logo?.thumbnail) {
      return (
        <img
          src={brand.logo.medium || brand.logo.thumbnail}
          alt={brand.name}
          className="dashboardHeader-event-selector-logo-image"
        />
      );
    }
    return (
      <div className="dashboardHeader-event-selector-logo-initial">
        {brand ? brand.name.charAt(0) : "B"}
      </div>
    );
  };

  // Helper function to render user avatar
  const renderUserAvatar = () => {
    if (user?.avatar?.medium || user?.avatar?.thumbnail) {
      return (
        <div className="dashboardHeader-profile-avatar-image">
          <img
            src={user.avatar.medium || user.avatar.thumbnail}
            alt={displayName}
          />
        </div>
      );
    }
    return null;
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "Select Date";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Select Date"; // Invalid date

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Select Date";
    }
  };

  return (
    <div className="dashboardHeader">
      <div className="dashboardHeader-content">
        {/* Profile Section */}
        <div className="dashboardHeader-profile">
          <div className="dashboardHeader-profile-avatar">
            <AvatarUpload
              user={currentUser}
              setUser={setCurrentUser}
              isCropMode={isCropMode}
              setIsCropMode={setIsCropMode}
            />
            <OnlineIndicator
              size="medium"
              className="dashboardHeader-profile-avatar-indicator"
            />
          </div>

          <div className="dashboardHeader-profile-info">
            <div className="dashboardHeader-profile-info-main">
              <div className="dashboardHeader-profile-info-main-nameGroup">
                <h1 className="dashboardHeader-profile-info-main-nameGroup-displayName">
                  {displayName}
                </h1>
                <span className="dashboardHeader-profile-info-main-nameGroup-username">
                  @{username}
                </span>
              </div>
              <div className="dashboardHeader-profile-info-main-stats">
                <div className="dashboardHeader-profile-info-main-stats-item">
                  <span className="dashboardHeader-profile-info-main-stats-item-value">
                    {brandsCount}
                  </span>
                  <span className="dashboardHeader-profile-info-main-stats-item-label">
                    Brands
                  </span>
                </div>
                <div className="dashboardHeader-profile-info-main-stats-divider">
                  ·
                </div>
                <div className="dashboardHeader-profile-info-main-stats-item">
                  <span className="dashboardHeader-profile-info-main-stats-item-value">
                    {eventsCount}
                  </span>
                  <span className="dashboardHeader-profile-info-main-stats-item-label">
                    Events
                  </span>
                </div>
              </div>
              <div className="dashboardHeader-profile-info-main-bio">
                {userRole}
              </div>
            </div>
          </div>
        </div>

        {/* Event Section (Brand Selector) */}
        <div className="dashboardHeader-event">
          <motion.div
            className="dashboardHeader-event-selector"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            onClick={() => setBrandDropdown(!brandDropdown)}
          >
            {brands && brands.length > 0 ? (
              <>
                <div className="dashboardHeader-event-selector-logo">
                  {renderBrandLogo(selectedBrand)}
                </div>
                <h2 className="dashboardHeader-event-selector-name">
                  {selectedBrand ? selectedBrand.name : "Select Brand"}
                </h2>
                <motion.div
                  className="dashboardHeader-event-selector-dropdown"
                  initial={false}
                  animate={{ rotate: brandDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RiArrowDownSLine />
                </motion.div>
              </>
            ) : null}
          </motion.div>

          {brandDropdown && (
            <div className="dashboardHeader-event-options">
              {brands && brands.length > 0 ? (
                brands.map((brand) => {
                  return (
                    <div
                      key={brand._id}
                      className="dashboardHeader-event-options-option"
                      onClick={() => handleSelectBrand(brand)}
                    >
                      <div className="dashboardHeader-event-options-option-logo">
                        {brand?.logo?.medium || brand?.logo?.thumbnail ? (
                          <img
                            src={brand.logo.medium || brand.logo.thumbnail}
                            alt={brand.name}
                            className="dashboardHeader-event-options-option-logo-image"
                          />
                        ) : (
                          <div className="dashboardHeader-event-options-option-logo-initial">
                            {brand.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="dashboardHeader-event-options-option-name">
                        {brand.name}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="dashboardHeader-event-options-empty">
                  No brands available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date Section */}
        <div className="dashboardHeader-date">
          <motion.div
            className={`dashboardHeader-date-display ${
              selectedDate ? "dashboardHeader-date-display-hasDate" : ""
            }`}
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            onClick={() => setDateDropdown(!dateDropdown)}
          >
            {selectedBrand &&
            selectedBrand.events &&
            selectedBrand.events.length > 0 ? (
              <>
                <RiCalendarEventLine className="dashboardHeader-date-display-icon" />
                <span className="dashboardHeader-date-display-text">
                  {formatDateForDisplay(selectedDate)}
                </span>
                <motion.div
                  className="dashboardHeader-date-display-dropdown"
                  initial={false}
                  animate={{ rotate: dateDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RiArrowDownSLine />
                </motion.div>
              </>
            ) : null}
          </motion.div>

          {dateDropdown && (
            <div className="dashboardHeader-date-options">
              {selectedBrand &&
              selectedBrand.events &&
              selectedBrand.events.length > 0 ? (
                (() => {
                  // Get current date for comparison
                  const now = new Date();

                  // Process events to handle end dates and times properly
                  const eventsWithEndDates = selectedBrand.events
                    .map((event) => {
                      // Get event start date (prioritize startDate over date)
                      const startDate = event.startDate
                        ? new Date(event.startDate)
                        : event.date
                        ? new Date(event.date)
                        : null;

                      if (!startDate) return null;

                      // Get end date (either endDate or calculated from startDate + endTime)
                      let endDate;

                      if (event.endDate) {
                        // If event has explicit end date, use it
                        endDate = new Date(event.endDate);

                        // If there's an endTime, set it on the end date
                        if (event.endTime) {
                          const [hours, minutes] = event.endTime
                            .split(":")
                            .map(Number);
                          endDate.setHours(hours, minutes || 0, 0);
                        }
                      } else if (event.endTime && startDate) {
                        // If only endTime exists, calculate endDate based on startDate
                        endDate = new Date(startDate);
                        const [hours, minutes] = event.endTime
                          .split(":")
                          .map(Number);

                        // If end time is earlier than start time, it means it ends the next day
                        if (event.startTime) {
                          const [startHours, startMinutes] = event.startTime
                            .split(":")
                            .map(Number);
                          if (
                            hours < startHours ||
                            (hours === startHours && minutes < startMinutes)
                          ) {
                            endDate.setDate(endDate.getDate() + 1);
                          }
                        }

                        endDate.setHours(hours, minutes || 0, 0);
                      } else {
                        // If no end date/time info, assume event ends same day at 23:59
                        endDate = new Date(startDate);
                        endDate.setHours(23, 59, 59);
                      }

                      return {
                        event,
                        startDate,
                        endDate,
                        displayDate: startDate,
                      };
                    })
                    .filter(Boolean); // Remove null items

                  // Sort events by start date
                  eventsWithEndDates.sort((a, b) => a.startDate - b.startDate);

                  // Group by unique start dates (for UI display)
                  const uniqueDates = [];
                  const dateMap = {};

                  eventsWithEndDates.forEach((item) => {
                    const dateStr = item.startDate.toISOString().split("T")[0];
                    if (!dateMap[dateStr]) {
                      dateMap[dateStr] = true;
                      uniqueDates.push({
                        date: item.startDate,
                        dateStr: dateStr,
                      });
                    }
                  });

                  // Separate past and active/future events based on end dates
                  const pastDates = uniqueDates.filter((item) => {
                    // Find all events for this date
                    const dateEvents = eventsWithEndDates.filter(
                      (e) =>
                        e.startDate.toISOString().split("T")[0] === item.dateStr
                    );

                    // Date is considered past only if ALL events on that date have ended
                    return dateEvents.every((e) => e.endDate < now);
                  });

                  const activeFutureDates = uniqueDates.filter((item) => {
                    // Find all events for this date
                    const dateEvents = eventsWithEndDates.filter(
                      (e) =>
                        e.startDate.toISOString().split("T")[0] === item.dateStr
                    );

                    // Date is active/future if ANY event on that date has not ended yet
                    return dateEvents.some((e) => e.endDate >= now);
                  });

                  // Get at most 1 past date (the most recent one)
                  const pastDate =
                    pastDates.length > 0
                      ? [pastDates[pastDates.length - 1]]
                      : [];

                  // Get at most 3 future/active dates
                  const limitedActiveFutureDates = activeFutureDates.slice(
                    0,
                    3
                  );

                  // Combine and sort the final set of dates
                  return [...pastDate, ...limitedActiveFutureDates].map(
                    (item) => {
                      // Check if this date has any co-hosted events
                      const dateEvents = eventsWithEndDates.filter(
                        (e) => e.startDate.toISOString().split("T")[0] === item.dateStr
                      );
                      const hasCoHostedEvents = dateEvents.some(e => e.event.coHostBrandInfo);
                      const isOnlyCoHosted = dateEvents.length > 0 && dateEvents.every(e => e.event.coHostBrandInfo);

                      return (
                        <div
                          key={item.dateStr}
                          className={`dashboardHeader-date-options-option ${
                            selectedDate === item.dateStr
                              ? "dashboardHeader-date-options-option-selected"
                              : ""
                          } ${isOnlyCoHosted ? "co-hosted-only" : hasCoHostedEvents ? "has-co-hosted" : ""}`}
                          onClick={() => handleSelectDate(item.dateStr)}
                        >
                          <span className="date-text">
                            {item.date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {isOnlyCoHosted && <span className="co-host-indicator">Co-hosting</span>}
                        </div>
                      );
                    }
                  );
                })()
              ) : (
                <div className="dashboardHeader-date-options-empty">
                  No events found
                </div>
              )}
              <div
                className="dashboardHeader-date-options-option dashboardHeader-date-options-option-viewAll"
                onClick={() => setShowEventsPopup(true)}
              >
                <RiMoreLine className="dashboardHeader-date-options-option-viewAll-icon" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Events Popup */}
      <CurrentEvents
        isOpen={showEventsPopup}
        onClose={() => setShowEventsPopup(false)}
        selectedBrand={selectedBrand}
        onSelectEvent={(event) => {
          if (event && (event.startDate || event.date)) {
            const eventDate = new Date(event.startDate || event.date)
              .toISOString()
              .split("T")[0];
            handleSelectDate(eventDate);
          }
          setShowEventsPopup(false);
        }}
      />
    </div>
  );
};

export default DashboardHeader;
