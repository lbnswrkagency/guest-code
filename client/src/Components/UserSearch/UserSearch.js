import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiSearchLine, RiUserLine, RiCloseLine } from "react-icons/ri";
import debounce from "lodash/debounce";
import axiosInstance from "../../utils/axiosConfig";
import { useAuth } from "../../contexts/AuthContext";
import "./UserSearch.scss";

const UserSearch = ({
  onSelect,
  placeholder = "Search users...",
  className = "",
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Debounced search function
  const searchUsers = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim() || !user) {
        setResults([]);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log("[UserSearch] Searching users with query:", searchQuery);

        // Get fresh token from localStorage
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required");
          return;
        }

        const response = await axiosInstance.get(
          `/search/users?query=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("[UserSearch] Search response:", response.data);
        setResults(response.data);
      } catch (error) {
        console.error("[UserSearch] Search error:", error);

        if (error.response?.status === 401) {
          console.log("[UserSearch] Token expired, attempting refresh");
          try {
            const refreshResponse = await axiosInstance.post(
              "/auth/refresh-token"
            );
            if (refreshResponse.data.token) {
              // Store new tokens
              localStorage.setItem("token", refreshResponse.data.token);
              localStorage.setItem(
                "refreshToken",
                refreshResponse.data.refreshToken
              );

              // Retry search with new token
              const retryResponse = await axiosInstance.get(
                `/search/users?query=${encodeURIComponent(searchQuery)}`,
                {
                  headers: {
                    Authorization: `Bearer ${refreshResponse.data.token}`,
                  },
                }
              );
              setResults(retryResponse.data);
              setError(null);
            }
          } catch (refreshError) {
            console.error("[UserSearch] Token refresh failed:", refreshError);
            setError("Session expired. Please log in again.");
            setResults([]);
          }
        } else {
          setError("Failed to search users. Please try again.");
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [user]
  );

  useEffect(() => {
    if (query) {
      searchUsers(query);
    }
  }, [query, searchUsers]);

  const handleSelect = (user) => {
    onSelect(user);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <div className={`user-search ${className}`}>
      <div className="search-input-wrapper">
        <RiSearchLine className="search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          className="search-input"
        />
        {query && <RiCloseLine className="clear-icon" onClick={handleClose} />}
      </div>

      <AnimatePresence>
        {isOpen && (results.length > 0 || isLoading || error) && (
          <motion.div
            className="results-container"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Searching...</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <span>{error}</span>
              </div>
            ) : (
              results.map((user) => (
                <motion.div
                  key={user._id}
                  className="user-result"
                  onClick={() => handleSelect(user)}
                  whileHover={{ backgroundColor: "rgba(255, 200, 7, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      <RiUserLine />
                    </div>
                  )}
                  <div className="user-info">
                    <span className="username">{user.username}</span>
                    {user.firstName && user.lastName && (
                      <span className="name">
                        {user.firstName} {user.lastName}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSearch;
