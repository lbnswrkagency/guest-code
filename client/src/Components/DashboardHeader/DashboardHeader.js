// DashboardHeader.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarEventLine,
  RiArrowDownSLine,
  RiMoreLine,
} from "react-icons/ri";
import { format, parseISO, isFuture, isPast, addDays } from "date-fns";
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
import { store } from "../../redux/store";

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
  const componentMounted = useRef(false);

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

  // SIMPLIFICATION: Directly extract events from Redux instead of transforming to local state
  const brandEvents = useMemo(() => {
    console.log(
      "[DashboardHeader] Computing brandEvents from selectedBrand:",
      selectedBrand
        ? {
            id: selectedBrand._id,
            name: selectedBrand.name,
            hasEvents: !!selectedBrand.events,
            eventsType: selectedBrand.events
              ? Array.isArray(selectedBrand.events)
                ? "array"
                : "object"
              : "none",
          }
        : "null"
    );

    if (!selectedBrand) {
      console.log(
        "[DashboardHeader] No selectedBrand, returning empty brandEvents"
      );
      return [];
    }

    // Add detailed logging for the events property
    if (!selectedBrand.events) {
      console.log("[DashboardHeader] selectedBrand has no events property");
      return [];
    }

    // Extract events based on the structure
    let result = [];
    if (Array.isArray(selectedBrand.events)) {
      console.log(
        "[DashboardHeader] selectedBrand.events is an array with",
        selectedBrand.events.length,
        "items"
      );
      result = selectedBrand.events;
    } else if (
      selectedBrand.events &&
      Array.isArray(selectedBrand.events.items)
    ) {
      console.log(
        "[DashboardHeader] selectedBrand.events.items is an array with",
        selectedBrand.events.items.length,
        "items"
      );
      result = selectedBrand.events.items;
    } else {
      console.log(
        "[DashboardHeader] Could not extract events from",
        typeof selectedBrand.events === "object"
          ? Object.keys(selectedBrand.events)
          : typeof selectedBrand.events
      );
    }

    console.log(
      "[DashboardHeader] brandEvents result has",
      result.length,
      "events"
    );
    return result;
  }, [selectedBrand]);

  // SIMPLIFICATION: Directly compute unique dates using useMemo
  const uniqueDates = useMemo(() => {
    console.log(
      "[DashboardHeader] uniqueDates useMemo running with brandEvents:",
      {
        brandEventsLength: brandEvents?.length || 0,
        brandEventsArray:
          brandEvents?.slice(0, 2)?.map((event) => ({
            id: event._id || event.id,
            title: event.title,
            date: event.date,
          })) || [],
      }
    );

    if (!brandEvents || brandEvents.length === 0) {
      console.log("[DashboardHeader] No events found to extract dates");
      return [];
    }

    console.log(
      "[DashboardHeader] Computing unique dates from",
      brandEvents.length,
      "events"
    );

    // Build unique dates from events
    const uniqueDatesMap = {};
    let eventsWithNoDate = 0;
    let eventsProcessed = 0;
    let eventsWithDateErrors = 0;

    brandEvents.forEach((event) => {
      if (!event.date) {
        eventsWithNoDate++;
        return;
      }

      try {
        const eventDate = new Date(event.date);
        // Check if the date is valid
        if (isNaN(eventDate.getTime())) {
          console.log("[DashboardHeader] Invalid date found:", event.date);
          eventsWithDateErrors++;
          return;
        }

        const dateKey = `${eventDate.getFullYear()}-${
          eventDate.getMonth() + 1
        }-${eventDate.getDate()}`;

        eventsProcessed++;

        if (!uniqueDatesMap[dateKey]) {
          uniqueDatesMap[dateKey] = {
            date: event.date,
            events: 1,
            firstEvent: event,
          };
        } else {
          uniqueDatesMap[dateKey].events += 1;
        }
      } catch (error) {
        console.error("[DashboardHeader] Error processing event date:", error);
        eventsWithDateErrors++;
      }
    });

    // Convert to array and sort
    const dates = Object.values(uniqueDatesMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    console.log("[DashboardHeader] Unique dates processing summary:", {
      totalEvents: brandEvents.length,
      eventsWithNoDate,
      eventsProcessed,
      eventsWithDateErrors,
      uniqueDatesCount: dates.length,
      uniqueDates: dates.map((d) => ({
        date: d.date,
        events: d.events,
        firstEventTitle: d.firstEvent?.title,
      })),
    });

    return dates;
  }, [brandEvents]);

  // Log the Redux state on mount to debug
  useEffect(() => {
    if (!componentMounted.current) {
      componentMounted.current = true;

      // Check the store directly on mount
      const directStoreSelectedBrand = checkStoreDirectly();

      console.log("[DashboardHeader] INITIAL MOUNT - Redux State:", {
        selectedBrand: selectedBrand
          ? {
              id: selectedBrand._id,
              name: selectedBrand.name,
              eventsCount: selectedBrand.events
                ? Array.isArray(selectedBrand.events)
                  ? selectedBrand.events.length
                  : selectedBrand.events.items
                  ? selectedBrand.events.items.length
                  : 0
                : 0,
            }
          : "null",
        selectedEvent: selectedEvent
          ? {
              id: selectedEvent._id || selectedEvent.id,
              title: selectedEvent.title,
              date: selectedEvent.date,
            }
          : "null",
        selectedDate: selectedDate
          ? new Date(selectedDate).toISOString()
          : "null",
        brandsCount: brands?.length || 0,
        useSelectorVsStore: directStoreSelectedBrand
          ? selectedBrand
            ? selectedBrand._id === directStoreSelectedBrand._id
              ? "SAME BRAND"
              : "DIFFERENT BRAND"
            : "useSelector NULL, Store HAS BRAND"
          : selectedBrand
          ? "useSelector HAS BRAND, Store NULL"
          : "BOTH NULL",
      });
    }
  }, []);

  // Debug log whenever selectedBrand changes - ADD MORE DETAILED LOGGING
  useEffect(() => {
    if (selectedBrand) {
      // Examine the complete structure of the selectedBrand object
      console.log("[DashboardHeader] DEEP INSPECTION - Selected Brand:", {
        id: selectedBrand._id,
        name: selectedBrand.name,
        eventsProperty: Object.prototype.toString.call(selectedBrand.events),
        eventsKeys: selectedBrand.events
          ? Object.keys(selectedBrand.events)
          : [],
        hasArrayEvents: Array.isArray(selectedBrand.events),
        hasItemsProperty:
          selectedBrand.events && "items" in selectedBrand.events,
        eventsCount: Array.isArray(selectedBrand.events)
          ? selectedBrand.events.length
          : selectedBrand.events && selectedBrand.events.items
          ? selectedBrand.events.items.length
          : 0,
        // If it's an array, log the first item
        firstEvent:
          Array.isArray(selectedBrand.events) && selectedBrand.events.length > 0
            ? {
                id: selectedBrand.events[0]._id || selectedBrand.events[0].id,
                title: selectedBrand.events[0].title,
                date: selectedBrand.events[0].date,
              }
            : null,
        // If it has items, log the first item
        firstItemEvent:
          selectedBrand.events &&
          selectedBrand.events.items &&
          selectedBrand.events.items.length > 0
            ? {
                id:
                  selectedBrand.events.items[0]._id ||
                  selectedBrand.events.items[0].id,
                title: selectedBrand.events.items[0].title,
                date: selectedBrand.events.items[0].date,
              }
            : null,
      });

      // Log the actual events data structure
      const eventsArray = Array.isArray(selectedBrand.events)
        ? selectedBrand.events
        : selectedBrand.events?.items || [];

      console.log("[DashboardHeader] BRAND CHANGED - Events Data:", {
        brandId: selectedBrand._id,
        brandName: selectedBrand.name,
        eventsCount: eventsArray.length,
        eventsData: eventsArray.slice(0, 3).map((e) => ({
          id: e._id || e.id,
          title: e.title,
          date: e.date,
        })),
      });

      console.log(
        "[DashboardHeader] Date dropdown will have",
        uniqueDates.length,
        "options"
      );
    }
  }, [selectedBrand, uniqueDates.length]);

  // Removed the complex useEffect that was trying to extract dates and auto-select events
  // SIMPLIFICATION: We'll rely on the useMemo hook above instead

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
      console.log(
        "[DashboardHeader] Selected brand with detailed inspection:",
        {
          id: brand._id,
          name: brand.name,
          eventsProperty: Object.prototype.toString.call(brand.events),
          eventsKeys: brand.events ? Object.keys(brand.events) : [],
          hasArrayEvents: Array.isArray(brand.events),
          hasItemsProperty: brand.events && "items" in brand.events,
          eventsCount: Array.isArray(brand.events)
            ? brand.events.length
            : brand.events && brand.events.items
            ? brand.events.items.length
            : 0,
        }
      );

      dispatch(setSelectedBrand(brand));

      // Reset the event and date when changing brands
      // The useEffect will handle setting the next event
      dispatch(setSelectedEvent(null));
      dispatch(setSelectedDate(null));
    }

    setBrandDropdown(false);
  };

  const handleDateSelect = (date) => {
    if (!date) {
      console.warn("[DashboardHeader] Attempted to select null date");
      return;
    }

    console.log("[DashboardHeader] Date selected:", date);

    // Set the selected date
    dispatch(setSelectedDate(new Date(date)));

    // Find the event that corresponds to this date
    if (selectedBrand) {
      // Use the brandEvents from useMemo
      const matchingEvent = brandEvents.find((event) => {
        if (!event.date) return false;

        const eventDate = new Date(event.date);
        const targetDate = new Date(date);

        return (
          eventDate.getFullYear() === targetDate.getFullYear() &&
          eventDate.getMonth() === targetDate.getMonth() &&
          eventDate.getDate() === targetDate.getDate()
        );
      });

      // If we found a matching event, set it as the selected event
      if (matchingEvent) {
        console.log("[DashboardHeader] Found matching event:", {
          id: matchingEvent._id || matchingEvent.id,
          title: matchingEvent.title,
          date: matchingEvent.date,
        });
        dispatch(setSelectedEvent(matchingEvent));
      } else {
        console.log("[DashboardHeader] No event found for date:", date);
      }
    }

    setDateDropdown(false);
  };

  const handleEventSelect = (event) => {
    // Handle event selection - navigate to event page or update state
    if (event && event.date) {
      console.log("[DashboardHeader] Event selected:", {
        id: event._id || event.id,
        title: event.title,
        date: event.date,
      });

      dispatch(setSelectedDate(new Date(event.date)));
      dispatch(setSelectedEvent(event)); // Set the selected event
      setShowEventsPopup(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Select Date";
    try {
      return format(new Date(date), "d MMM yyyy");
    } catch (error) {
      console.error("[DashboardHeader] Error formatting date:", date, error);
      return "Invalid Date";
    }
  };

  // Format date with day of week for the dropdown
  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "EEE, d MMM yyyy");
    } catch (error) {
      console.error(
        "[DashboardHeader] Error formatting event date:",
        dateString,
        error
      );
      return "Invalid Date";
    }
  };

  // Check if a date is the currently selected date
  const isSelectedDate = (dateStr) => {
    if (!selectedDate) return false;

    try {
      const date1 = new Date(selectedDate);
      const date2 = new Date(dateStr);

      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    } catch (error) {
      console.error("[DashboardHeader] Error comparing dates:", {
        selectedDate,
        dateStr,
        error,
      });
      return false;
    }
  };

  // Add a direct store check on component mount and when toggles happen
  const checkStoreDirectly = () => {
    const storeState = store.getState();
    const storeSelectedBrand = storeState.ui?.selectedBrand;
    const storeSelectedEvent = storeState.ui?.selectedEvent;

    console.log("[DashboardHeader] DIRECT STORE CHECK:", {
      hasUiSlice: !!storeState.ui,
      storeSelectedBrand: storeSelectedBrand
        ? {
            id: storeSelectedBrand._id,
            name: storeSelectedBrand.name,
            eventsType: storeSelectedBrand.events
              ? Array.isArray(storeSelectedBrand.events)
                ? "array"
                : "object"
              : "none",
            eventsCount: Array.isArray(storeSelectedBrand.events)
              ? storeSelectedBrand.events.length
              : storeSelectedBrand.events?.items?.length || 0,
          }
        : null,
      storeSelectedEvent: storeSelectedEvent
        ? {
            id: storeSelectedEvent._id || storeSelectedEvent.id,
            title: storeSelectedEvent.title,
            date: storeSelectedEvent.date,
          }
        : null,
    });

    return storeSelectedBrand;
  };

  // Update the date dropdown toggle function
  const toggleDateDropdown = () => {
    // Check store directly before toggling
    checkStoreDirectly();

    setDateDropdown(!dateDropdown);
    console.log("[DashboardHeader] Date dropdown toggled:", {
      uniqueDatesCount: uniqueDates.length,
      selectedDate: selectedDate ? new Date(selectedDate).toISOString() : null,
      brandEventsCount: brandEvents.length,
    });
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
            onClick={toggleDateDropdown}
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
              {uniqueDates.length > 0 ? (
                uniqueDates.map((dateObj, index) => (
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
                      {dateObj.events > 1 && (
                        <span className="events-count">
                          {dateObj.events} events
                        </span>
                      )}
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
