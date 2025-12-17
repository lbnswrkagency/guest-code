import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FiSearch, FiX, FiUser, FiBriefcase, FiCalendar } from "react-icons/fi";
import "./Search.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiSearchLine,
  RiUserLine,
  RiCalendarEventLine,
  RiBuildingLine,
} from "react-icons/ri";
import debounce from "lodash/debounce";
import axiosInstance from "../../utils/axiosConfig";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../Components/Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { getEventUrl } from "../../utils/urlUtils";

const Search = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Default to brands since that's all we're showing
  const [activeTab, setActiveTab] = useState("brands");
  const [results, setResults] = useState([]);
  const [resultCounts, setResultCounts] = useState({ brands: 0, events: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Feature flag to enable/disable events search
  const ENABLE_EVENTS_SEARCH = false; // Set to false to disable events

  const performSearch = useCallback(
    debounce(async (query, type) => {
      if (!query.trim()) {
        setResults([]);
        setResultCounts({ brands: 0, events: 0 });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get("/search", {
          params: {
            q: query,
            type: undefined,
          },
        });

        // Filter out events if the feature is disabled
        const filteredResults = ENABLE_EVENTS_SEARCH
          ? response.data
          : response.data.filter((item) => item.type !== "event");

        setResults(filteredResults);

        // Calculate counts for each category
        const counts = {
          brands: filteredResults.filter((item) => item.type === "brand")
            .length,
          events: ENABLE_EVENTS_SEARCH
            ? filteredResults.filter((item) => item.type === "event").length
            : 0,
        };
        setResultCounts(counts);
      } catch (err) {
        setError("Failed to perform search. Please try again.");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [ENABLE_EVENTS_SEARCH]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const handleResultClick = (item) => {
    onClose(); // Close the search overlay

    switch (item.type) {
      case "user":
        if (!item.username) {
          toast.showError("Unable to navigate to user profile");
          return;
        }
        navigate(`/@${item.username}`);
        break;
      case "brand":
        if (!item.username) {
          console.error("[Search] Brand username is missing:", item);
          toast.showError("Unable to navigate to brand profile");
          return;
        }

        if (user) {
          // For authenticated users, use full URL and force a page reload
          // to ensure proper route resolution
          const brandPath = `/@${user.username}/@${item.username}`;
          // Use window.location.href to force a full page reload
          window.location.href = brandPath;
        } else {
          // For non-authenticated users, client-side navigation works fine
          const brandPath = `/@${item.username}`;
          navigate(brandPath);
        }
        break;
      /* Event case is kept for future implementation
      case "event":
        // Navigate to the event with a pretty URL
        console.log("[Search] Full event data:", JSON.stringify(item, null, 2));
        console.log("[Search] Event data for URL generation:", {
          id: item._id,
          name: item.name,
          startDate: item.startDate,
          brandUsername: item.brandUsername,
        });

        // Check if we have all the data needed for a pretty URL
        // Accept data from multiple possible sources in the search result
        const brandUsername =
          (item.brand && item.brand.username) || // Nested object
          item.brandUsername || // Direct property
          (typeof item.brand === "string" ? item.brand : null); // String ID (less ideal)

        console.log("[Search] Extracted brandUsername:", brandUsername);
        console.log("[Search] Has direct brand:", !!item.brand);
        console.log("[Search] Has brandUsername:", !!item.brandUsername);
        console.log("[Search] Brand type:", typeof item.brand);

        console.log("[Search] Using item.name for title:", item.name);

        if (brandUsername) {
          // Try to get a valid date
          let eventDate;
          try {
            // Use startDate
            eventDate = new Date(item.startDate);
            // Check if date is valid
            if (isNaN(eventDate.getTime())) {
              throw new Error("Invalid date");
            }
          } catch (err) {
            console.error(
              "[Search] Invalid event date:",
              item.date,
              item.startDate
            );
            // Navigate to event by ID as fallback
            navigate(`/events/${item._id}`);
            return;
          }

          // Format date for URL (MMDDYY)
          const month = String(eventDate.getMonth() + 1).padStart(2, "0");
          const day = String(eventDate.getDate()).padStart(2, "0");
          const year = String(eventDate.getFullYear()).slice(2);
          const dateSlug = `${month}${day}${year}`;

          console.log("[Search] Formatted date slug:", dateSlug);

          // Construct the URL path with /@username/@brandusername/dateSlug format or /@brandusername/dateSlug for public
          const eventPath = user
            ? `/@${user.username}/@${brandUsername}/${dateSlug}`
            : `/@${brandUsername}/${dateSlug}`;

          // Make sure the @ is included for the brand username
          const finalPath = eventPath.replace("/@", "@").includes("@")
            ? eventPath
            : eventPath.replace(`/${brandUsername}`, `/@${brandUsername}`);

          console.log(
            "[Search] Navigating to event with new format URL:",
            finalPath
          );
          navigate(finalPath);
        } else {
          // Fallback if missing data
          console.log(
            "[Search] Missing data for pretty URL, falling back to ID URL:",
            {
              hasBrand: !!item.brand || !!item.brandUsername,
              hasBrandUsername:
                (item.brand && !!item.brand.username) || !!item.brandUsername,
              hasStartDate: !!item.startDate,
              hasName: !!item.name,
            }
          );
          console.log("[Search] Navigating to event with ID:", item._id);
          navigate(`/events/${item._id}`);
        }
        break;
      */
      default:
    }
  };

  // Define tabs - only include brands (events is commented out for future use)
  const tabs = [
    { id: "brands", label: "Brands", icon: RiBuildingLine },
    // Commented out until event search is implemented
    // { id: "events", label: "Events", icon: RiCalendarEventLine },
  ];

  // Render an event date in the proper format - kept for future implementation
  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "TBD";

      // Format as DD.MM.YY with leading zeros
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(2);

      return `${day}.${month}.${year}`;
    } catch (e) {
      return "TBD";
    }
  };

  const renderResultItem = (item) => {
    const commonProps = {
      key: item._id,
      className: `search-result-item ${item.type}`,
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      whileHover: { scale: 1.02 },
      transition: { duration: 0.2 },
      onClick: () => handleResultClick(item),
    };

    const getTypeIcon = () => {
      switch (item.type) {
        // case "user":
        //   return <RiUserLine className="type-icon" />;
        case "event":
          return <RiCalendarEventLine className="type-icon" />;
        case "brand":
          return <RiBuildingLine className="type-icon" />;
        default:
          return null;
      }
    };

    return (
      <motion.div {...commonProps}>
        <div className="result-avatar">
          {item.avatar ? (
            <img src={item.avatar} alt={item.name} />
          ) : (
            <div className="avatar-placeholder">
              {item.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="result-info">
          <h3>{item.name}</h3>
          {/* {item.type === "user" && <p>{item.email}</p>} */}
          {/* Event rendering kept but not visible until feature is enabled
          {item.type === "event" && (
            <p>
              {formatEventDate(item.startDate)} •{" "}
              {item.location || "TBD"}
            </p>
          )}
          */}
          {item.type === "brand" && (
            <p>
              {item.members} team member{item.members !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className={`type-indicator ${item.type}`}>{getTypeIcon()}</div>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <div className="search-input-wrapper">
            <RiSearchLine className="search-icon" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="search-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`tab-button ${activeTab === id ? "active" : ""}`}
              onClick={() => handleTabClick(id)}
            >
              <Icon />
              {label} {id === "brands" ? `(${resultCounts.brands})` : ""}
            </button>
          ))}
        </div>

        <div className="search-results">
          {loading && <div className="search-loading">Searching...</div>}
          {error && <div className="search-error">{error}</div>}
          {!loading && !error && results.length === 0 && searchQuery && (
            <div className="no-results">No results found</div>
          )}
          <AnimatePresence>
            {!loading &&
              !error &&
              results
                .filter((item) => item.type === "brand")
                .map((item) => renderResultItem(item))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Search;
