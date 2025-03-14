// DashboardHeader.js
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiMoreLine,
} from "react-icons/ri";
import { format } from "date-fns";
import "./DashboardHeader.scss";
import { useSocket } from "../../contexts/SocketContext";
import { useSelector, useDispatch } from "react-redux";
import { selectAllBrands } from "../../redux/brandSlice";
import { selectUser } from "../../redux/userSlice";
import {
  selectSelectedBrand,
  selectSelectedEvent,
  selectSelectedDate,
  setSelectedBrand,
  setSelectedEvent,
  setSelectedDate,
} from "../../redux/uiSlice";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import OnlineIndicator from "../OnlineIndicator/OnlineIndicator";
import CurrentEvents from "../CurrentEvents/CurrentEvents";

const DashboardHeader = ({
  user,
  setUser,
  userRoles = [], // User roles prop with default empty array
  isOnline,
}) => {
  const dispatch = useDispatch();
  const { isConnected } = useSocket();
  const [isCropMode, setIsCropMode] = useState(false);
  const [userRole, setUserRole] = useState("");

  // State for dropdowns
  const [brandDropdown, setBrandDropdown] = useState(false);
  const [dateDropdown, setDateDropdown] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);

  // Get data from Redux store
  const reduxUser = useSelector(selectUser);
  const brands = useSelector(selectAllBrands);

  // Get UI selections from Redux
  const selectedBrand = useSelector(selectSelectedBrand);
  const selectedEvent = useSelector(selectSelectedEvent);
  const selectedDate = useSelector(selectSelectedDate);

  // Stats derived from Redux data
  const [stats, setStats] = useState({
    members: 0,
    brands: 0,
    events: 0,
  });

  // Update stats when Redux data changes
  useEffect(() => {
    // Count the total number of brands
    const brandsCount = brands?.length || 0;

    // Count the total number of events across all brands
    let eventsCount = 0;
    if (brands && brands.length > 0) {
      brands.forEach((brand) => {
        // Check both possible structures for events
        if (Array.isArray(brand.events)) {
          eventsCount += brand.events.length;
        } else if (brand.events && Array.isArray(brand.events.items)) {
          eventsCount += brand.events.items.length;
        }
      });
    }

    // Set the stats
    setStats({
      // Get team size from various possible properties
      members: selectedBrand?.teamSize || selectedBrand?.memberCount || 0,
      brands: brandsCount,
      events: eventsCount,
    });
  }, [brands, selectedBrand]);

  // Determine user's role in the selected brand
  useEffect(() => {
    if (selectedBrand && user?._id) {
      const roleName = selectedBrand.roleName || "Member";
      setUserRole(roleName);
    } else {
      setUserRole(""); // Reset if no brand selected
    }
  }, [selectedBrand, user]);

  const formatStatLabel = (value, singular, plural) => {
    return value === 1 ? singular : plural;
  };

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

  const handleBrandSelect = (brand) => {
    // Only update if a different brand is selected
    if (!selectedBrand || brand._id !== selectedBrand._id) {
      dispatch(setSelectedBrand(brand));
    }

    setBrandDropdown(false);
  };

  const handleDateSelect = (date) => {
    // Set the selected date
    dispatch(setSelectedDate(new Date(date)));

    // Find the event that corresponds to this date
    if (selectedBrand) {
      const selectedDate = new Date(date);
      let brandEvents = [];

      // Handle both possible event structures
      if (Array.isArray(selectedBrand.events)) {
        brandEvents = selectedBrand.events;
      } else if (
        selectedBrand.events &&
        Array.isArray(selectedBrand.events.items)
      ) {
        brandEvents = selectedBrand.events.items;
      }

      const matchingEvent = brandEvents.find((event) => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === selectedDate.toDateString();
      });

      // If we found a matching event, set it as the selected event
      if (matchingEvent) {
        dispatch(setSelectedEvent(matchingEvent));
      }
    }

    setDateDropdown(false);
  };

  const handleEventSelect = (event) => {
    // Handle event selection - navigate to event page or update state
    dispatch(setSelectedDate(new Date(event.date)));
    dispatch(setSelectedEvent(event)); // Set the selected event
    setShowEventsPopup(false);
  };

  const formatDate = (date) => {
    if (!date) return "Select Date";
    return format(date, "d MMM yyyy");
  };

  // Format date with day of week for the dropdown
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "EEE, d MMM yyyy");
  };

  // Group events by date to avoid duplicates
  const getUniqueDates = () => {
    if (!selectedBrand) {
      return [];
    }

    let brandEvents = [];

    // Handle both possible event structures
    if (Array.isArray(selectedBrand.events)) {
      brandEvents = selectedBrand.events;
    } else if (
      selectedBrand.events &&
      Array.isArray(selectedBrand.events.items)
    ) {
      brandEvents = selectedBrand.events.items;
    } else {
      return [];
    }

    const uniqueDates = {};

    brandEvents.forEach((event) => {
      if (!event.date) return;

      const dateStr = new Date(event.date).toISOString().split("T")[0]; // Get YYYY-MM-DD part
      if (!uniqueDates[dateStr]) {
        uniqueDates[dateStr] = {
          date: event.date,
          events: 1,
        };
      } else {
        uniqueDates[dateStr].events += 1;
      }
    });

    return Object.values(uniqueDates).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  // Check if a date is the currently selected date
  const isSelectedDate = (dateStr) => {
    if (!selectedDate) return false;

    const formattedSelected = format(selectedDate, "yyyy-MM-dd");
    const formattedDate = format(new Date(dateStr), "yyyy-MM-dd");

    return formattedSelected === formattedDate;
  };

  return (
    <div className="dashboard-header">
      <div className="dashboard-header-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="avatar-wrapper">
            <AvatarUpload
              user={user}
              setUser={setUser}
              isCropMode={isCropMode}
              setIsCropMode={setIsCropMode}
            />
            {user?._id && (
              <OnlineIndicator
                userId={user._id}
                size="medium"
                className="profile-online-indicator"
              />
            )}
          </div>

          <div className="user-info">
            <div className="user-info-main">
              <div className="name-group">
                <h1 className="display-name">{user.firstName}</h1>
                <span className="username">@{user.username}</span>
              </div>
              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-value">{stats.brands}</span>{" "}
                  {formatStatLabel(stats.brands, "Brand", "Brands")}
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">{stats.events}</span>{" "}
                  {formatStatLabel(stats.events, "Event", "Events")}
                </div>
              </div>
              <div className="user-bio">
                {userRole || "Member at GuestCode"}
              </div>
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
            <div className="event-logo">
              {selectedBrand && selectedBrand.logo ? (
                <img
                  src={selectedBrand.logo.thumbnail}
                  alt={selectedBrand.name}
                />
              ) : (
                <div className="brand-initial">
                  {selectedBrand ? selectedBrand.name.charAt(0) : "B"}
                </div>
              )}
            </div>
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
              {brands &&
                brands.map((brand) => (
                  <div
                    key={brand._id}
                    className={`brand-option ${
                      selectedBrand && selectedBrand._id === brand._id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleBrandSelect(brand)}
                  >
                    {brand.logo ? (
                      <img
                        src={brand.logo.thumbnail}
                        alt={brand.name}
                        className="brand-logo"
                      />
                    ) : (
                      <div className="brand-initial">
                        {brand.name.charAt(0)}
                      </div>
                    )}
                    <span>{brand.name}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Date Section */}
        <div className="date-section">
          <motion.div
            className="date-display"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            onClick={() => setDateDropdown(!dateDropdown)}
          >
            <RiCalendarEventLine className="calendar-icon" />
            <span>{formatDate(selectedDate)}</span>
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
              {getUniqueDates().length > 0 ? (
                getUniqueDates().map((dateObj, index) => (
                  <div
                    key={index}
                    className={`date-option ${
                      isSelectedDate(dateObj.date) ? "active" : ""
                    }`}
                    onClick={() => handleDateSelect(dateObj.date)}
                  >
                    <div className="date-info">
                      <span className="date-text">
                        {formatEventDate(dateObj.date)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-dates">No events found for this brand</div>
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
        onSelectEvent={handleEventSelect}
      />
    </div>
  );
};

export default DashboardHeader;
