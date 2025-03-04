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
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState([]);
  const [resultCounts, setResultCounts] = useState({ brands: 0, events: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

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
            type: type === "all" ? undefined : type,
          },
        });

        setResults(response.data);

        // Calculate counts for each category
        const counts = {
          brands: response.data.filter((item) => item.type === "brand").length,
          events: response.data.filter((item) => item.type === "event").length,
        };
        setResultCounts(counts);
      } catch (err) {
        setError("Failed to perform search. Please try again.");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(searchQuery, activeTab);
  }, [searchQuery, activeTab, performSearch]);

  const handleTabClick = (tabId) => {
    setActiveTab((prev) => (prev === tabId ? "all" : tabId));
  };

  const handleResultClick = (item) => {
    console.log("[Search] Handling result click:", {
      type: item.type,
      id: item._id,
      username: item.username,
      name: item.name,
      isAuthenticated: !!user,
    });

    onClose(); // Close the search overlay

    switch (item.type) {
      case "user":
        if (!item.username) {
          console.error("[Search] User username is missing:", item);
          toast.showError("Unable to navigate to user profile");
          return;
        }
        console.log("[Search] Navigating to user:", `/@${item.username}`);
        navigate(`/@${item.username}`);
        break;
      case "brand":
        if (!item.username) {
          console.error("[Search] Brand username is missing:", item);
          toast.showError("Unable to navigate to brand profile");
          return;
        }
        const brandPath = user
          ? `/@${user.username}/@${item.username}`
          : `/@${item.username}`;
        console.log("[Search] Navigating to brand:", brandPath);
        navigate(brandPath);
        break;
      case "event":
        // Navigate to the event with a pretty URL
        console.log("[Search] Full event data:", JSON.stringify(item, null, 2));
        console.log("[Search] Event data for URL generation:", {
          id: item._id,
          name: item.name,
          date: item.date,
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

        if (brandUsername && item.date && item.name) {
          // Format date for URL (MMDDYY)
          const eventDate = new Date(item.date);
          const month = String(eventDate.getMonth() + 1).padStart(2, "0");
          const day = String(eventDate.getDate()).padStart(2, "0");
          const year = String(eventDate.getFullYear()).slice(2);
          const dateSlug = `${month}${day}${year}`;

          console.log("[Search] Formatted date slug:", dateSlug);

          // No longer using title part in URL as requested and removing /e/ segment

          // Construct the URL path without the /e/ and title
          const eventPath = user
            ? `/@${user.username}/@${brandUsername}/${dateSlug}`
            : `/@${brandUsername}/${dateSlug}`;

          // Make sure the @ is included for the brand username
          const finalPath = eventPath.replace("/@", "@").includes("@")
            ? eventPath
            : eventPath.replace(`/${brandUsername}`, `/@${brandUsername}`);

          console.log(
            "[Search] Navigating to event with pretty URL:",
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
              hasDate: !!item.date,
              hasName: !!item.name,
            }
          );
          console.log("[Search] Navigating to event with ID:", item._id);
          navigate(`/events/${item._id}`);
        }
        break;
      default:
        console.log("[Search] Unhandled item type:", item.type);
    }
  };

  const tabs = [
    // { id: "users", label: "Users", icon: RiUserLine }, // Commented out user search tab
    { id: "events", label: "Events", icon: RiCalendarEventLine },
    { id: "brands", label: "Brands", icon: RiBuildingLine },
  ];

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
          {item.type === "event" && (
            <p>
              {new Date(item.date).toLocaleDateString()} • {item.location}
            </p>
          )}
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
              placeholder="Search events or brands..."
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
              {label}{" "}
              {id === "events"
                ? `(${resultCounts.events})`
                : id === "brands"
                ? `(${resultCounts.brands})`
                : ""}
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
              results.map((item) => renderResultItem(item))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Search;
