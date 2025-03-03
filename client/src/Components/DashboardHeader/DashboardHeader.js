// DashboardHeader.js
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiMoreLine,
} from "react-icons/ri";
import { FaChevronDown, FaCalendarDay } from "react-icons/fa";
import { format, addDays, subDays } from "date-fns";
import "./DashboardHeader.scss";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import AvatarUpload from "../AvatarUpload/AvatarUpload";
import OnlineIndicator from "../OnlineIndicator/OnlineIndicator";
import CurrentEvents from "../CurrentEvents/CurrentEvents";
import axiosInstance from "../../utils/axiosConfig";

const DashboardHeader = ({
  user,
  setUser,
  selectedBrand,
  setSelectedBrand,
  selectedDate,
  setSelectedDate,
  userRoles = [], // Add userRoles prop with default empty array
}) => {
  const { isConnected } = useSocket();
  const { user: authUser } = useAuth();
  const [isCropMode, setIsCropMode] = useState(false);
  const [userRole, setUserRole] = useState("");

  // State for dropdowns
  const [brandDropdown, setBrandDropdown] = useState(false);
  const [dateDropdown, setDateDropdown] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [userBrands, setUserBrands] = useState([]);
  const [brandEvents, setBrandEvents] = useState([]);

  // Log whenever props change
  useEffect(() => {
    console.log("[DashboardHeader] Props updated:", {
      selectedBrand: selectedBrand
        ? `${selectedBrand.name} (${selectedBrand._id})`
        : "none",
      selectedDate: selectedDate
        ? new Date(selectedDate).toISOString()
        : "none",
    });
  }, [selectedBrand, selectedDate]);

  // Sample data (replace with real data later)
  const stats = {
    members: 25,
    brands: 1,
    events: 23,
  };

  // Fetch user brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        console.log("[DashboardHeader] Fetching brands...");
        const response = await axiosInstance.get("/brands");
        if (response.data && response.data.length > 0) {
          console.log(
            "[DashboardHeader] Brands fetched:",
            response.data.length
          );
          setUserBrands(response.data);
          // Set the first brand as selected if none is selected
          if (!selectedBrand) {
            console.log(
              "[DashboardHeader] Setting initial brand:",
              response.data[0].name
            );
            setSelectedBrand(response.data[0]);
          }
        }
      } catch (error) {
        console.error("[DashboardHeader] Error fetching brands:", error);
      }
    };

    fetchBrands();
  }, []);

  // Determine user's role in the selected brand
  useEffect(() => {
    if (selectedBrand && user?._id) {
      console.log(
        "[DashboardHeader] Determining user role for brand:",
        selectedBrand.name
      );
      console.log("[DashboardHeader] User:", user._id);
      console.log("[DashboardHeader] Brand owner:", selectedBrand.owner);
      console.log("[DashboardHeader] Brand team:", selectedBrand.team);

      // Log available user roles for this brand
      console.log("[DashboardHeader] Available userRoles:", userRoles);
      const brandRoles = userRoles.filter(
        (role) =>
          role.brandId === selectedBrand._id ||
          (typeof role.brandId === "object" &&
            role.brandId._id === selectedBrand._id)
      );
      console.log(
        "[DashboardHeader] Filtered roles for this brand:",
        brandRoles
      );

      // Check if user is the brand owner
      if (
        selectedBrand.owner === user._id ||
        (typeof selectedBrand.owner === "object" &&
          selectedBrand.owner._id === user._id)
      ) {
        console.log("[DashboardHeader] User is the OWNER of this brand");
        setUserRole(`Owner ${selectedBrand.name}`);
        return;
      }

      // Check if user is a team member
      if (selectedBrand.team && Array.isArray(selectedBrand.team)) {
        const teamMember = selectedBrand.team.find(
          (member) =>
            member.user === user._id ||
            (typeof member.user === "object" && member.user._id === user._id)
        );

        if (teamMember) {
          // Format role name: first letter uppercase, rest lowercase
          let formattedRole = "Member";

          if (teamMember.role) {
            // Handle case where role might be all uppercase or mixed case
            formattedRole =
              teamMember.role.charAt(0).toUpperCase() +
              teamMember.role.slice(1).toLowerCase();
          }

          // Log the role formatting for debugging
          console.log("[DashboardHeader] User is a TEAM MEMBER with role:", {
            originalRole: teamMember.role,
            formattedRole: formattedRole,
            teamMemberData: teamMember,
          });

          setUserRole(`${formattedRole} ${selectedBrand.name}`);
          return;
        }
      }

      // Default role if no specific role found
      console.log(
        "[DashboardHeader] No specific role found, defaulting to MEMBER"
      );
      setUserRole(`Member ${selectedBrand.name}`);
    } else {
      console.log("[DashboardHeader] No brand or user selected, clearing role");
      setUserRole(""); // Reset if no brand selected
    }
  }, [selectedBrand, user, userRoles]);

  // Fetch events for selected brand
  useEffect(() => {
    const fetchBrandEvents = async () => {
      if (!selectedBrand) return;

      try {
        console.log(
          "[DashboardHeader] Fetching events for brand:",
          selectedBrand.name
        );
        // Use the same endpoint as in Events.js
        const response = await axiosInstance.get(
          `/events/brand/${selectedBrand._id}`
        );

        if (response.data) {
          // Sort events by date
          const sortedEvents = response.data.sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );

          console.log("[DashboardHeader] Events fetched:", sortedEvents.length);
          setBrandEvents(sortedEvents);

          // Set the first event date as selected if available and no date is selected
          if (sortedEvents.length > 0 && !selectedDate) {
            console.log(
              "[DashboardHeader] Setting initial date:",
              new Date(sortedEvents[0].date).toISOString()
            );
            setSelectedDate(new Date(sortedEvents[0].date));
          }
        }
      } catch (error) {
        console.error("[DashboardHeader] Error fetching brand events:", error);
        setBrandEvents([]);
      }
    };

    if (selectedBrand?._id) {
      fetchBrandEvents();
    }
  }, [selectedBrand]);

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
    console.log("[DashboardHeader] Brand selected:", brand.name);
    setSelectedBrand(brand);
    setBrandDropdown(false);
    // Reset selected date when changing brands
    setSelectedDate(null);
  };

  const handleDateSelect = (date) => {
    console.log(
      "[DashboardHeader] Date selected:",
      new Date(date).toISOString()
    );
    setSelectedDate(new Date(date));
    setDateDropdown(false);
  };

  const handleEventSelect = (event) => {
    // Handle event selection - navigate to event page or update state
    setSelectedDate(new Date(event.date));
    setShowEventsPopup(false);
    console.log("Selected event:", event);
    // Implementation depends on your app's navigation/state management
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
      <div className="header-content">
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
                  <span className="stat-value">{stats.members}</span>{" "}
                  {formatStatLabel(stats.members, "Member", "Members")}
                </div>
                <div className="stat-divider">·</div>
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
              {userBrands.map((brand) => (
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
                    <div className="brand-initial">{brand.name.charAt(0)}</div>
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
