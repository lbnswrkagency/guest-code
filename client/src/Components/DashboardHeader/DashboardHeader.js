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
      if (!e.target.closest(".event-section")) {
        setBrandDropdown(false);
      }
      if (!e.target.closest(".date-section")) {
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
    if (!roleName) return "Member";
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
          className="brand-logo-image"
        />
      );
    }
    return (
      <div className="brand-initial">{brand ? brand.name.charAt(0) : "B"}</div>
    );
  };

  // Helper function to render user avatar
  const renderUserAvatar = () => {
    if (user?.avatar?.medium || user?.avatar?.thumbnail) {
      return (
        <div className="user-avatar">
          <img
            src={user.avatar.medium || user.avatar.thumbnail}
            alt={displayName}
            className="avatar-image"
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
    <div className="dashboard-header">
      <div className="dashboard-header-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="avatar-wrapper">
            {renderUserAvatar()}
            <AvatarUpload
              user={currentUser}
              setUser={setCurrentUser}
              isCropMode={isCropMode}
              setIsCropMode={setIsCropMode}
            />
            <OnlineIndicator
              size="medium"
              className="profile-online-indicator"
            />
          </div>

          <div className="user-info">
            <div className="user-info-main">
              <div className="name-group">
                <h1 className="display-name">{displayName}</h1>
                <span className="username">@{username}</span>
              </div>
              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-value">{brandsCount}</span> Brands
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">{eventsCount}</span> Events
                </div>
              </div>
              <div className="user-bio">{userRole}</div>
            </div>
          </div>
        </div>

        {/* Event Section (Brand Selector) */}
        <div className="event-section">
          <motion.div
            className="event-selector"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            onClick={() => setBrandDropdown(!brandDropdown)}
          >
            <div className="event-logo">{renderBrandLogo(selectedBrand)}</div>
            <h2 className="event-name">
              {selectedBrand ? selectedBrand.name : "Select Brand"}
            </h2>
            <motion.div
              className="dropdown-icon"
              initial={false}
              animate={{ rotate: brandDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <RiArrowDownSLine />
            </motion.div>
          </motion.div>

          {brandDropdown && (
            <div className="brand-options">
              {brands && brands.length > 0 ? (
                brands.map((brand) => (
                  <div
                    key={brand._id}
                    className="brand-option"
                    onClick={() => handleSelectBrand(brand)}
                  >
                    <div className="brand-option-logo">
                      {renderBrandLogo(brand)}
                    </div>
                    <div className="brand-option-name">{brand.name}</div>
                  </div>
                ))
              ) : (
                <div className="no-brands">No brands available</div>
              )}
            </div>
          )}
        </div>

        {/* Date Section */}
        <div className="date-section">
          <motion.div
            className={`date-display ${selectedDate ? "has-date" : ""}`}
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            onClick={() => setDateDropdown(!dateDropdown)}
          >
            <RiCalendarEventLine className="calendar-icon" />
            <span>{formatDateForDisplay(selectedDate)}</span>
            <motion.div
              className="dropdown-icon"
              initial={false}
              animate={{ rotate: dateDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <RiArrowDownSLine />
            </motion.div>
          </motion.div>

          {dateDropdown && (
            <div className="date-options">
              {selectedBrand &&
              selectedBrand.events &&
              selectedBrand.events.length > 0 ? (
                (() => {
                  // Get current date at the start of the day
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);

                  // Get unique dates and convert them to Date objects
                  const dates = [
                    ...new Set(
                      selectedBrand.events
                        .map((event) =>
                          event.date ? new Date(event.date) : null
                        )
                        .filter(Boolean)
                    ),
                  ].sort((a, b) => a - b);

                  // Separate past and future dates
                  const pastDates = dates.filter((date) => date < now);
                  const futureDates = dates.filter((date) => date >= now);

                  // Get at most 1 past date (the most recent one)
                  const pastDate =
                    pastDates.length > 0
                      ? [pastDates[pastDates.length - 1]]
                      : [];

                  // Get at most 3 future dates
                  const limitedFutureDates = futureDates.slice(0, 3);

                  // Combine and sort the final set of dates
                  return [...pastDate, ...limitedFutureDates].map((date) => {
                    const dateStr = date.toISOString().split("T")[0];
                    return (
                      <div
                        key={dateStr}
                        className={`date-option ${
                          selectedDate === dateStr ? "selected" : ""
                        }`}
                        onClick={() => handleSelectDate(dateStr)}
                      >
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="no-dates">No events found</div>
              )}
              <div
                className="date-option view-all"
                onClick={() => setShowEventsPopup(true)}
              >
                <RiMoreLine className="more-icon" />
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
          if (event && event.date) {
            const eventDate = new Date(event.date).toISOString().split("T")[0];
            handleSelectDate(eventDate);
          }
          setShowEventsPopup(false);
        }}
      />
    </div>
  );
};

export default DashboardHeader;
