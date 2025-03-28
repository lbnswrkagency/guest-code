import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiRefreshLine,
  RiFileChartLine,
  RiUserLine,
} from "react-icons/ri";
import "./Analytics.scss";
import axiosInstance from "../../utils/axiosConfig";

const Analytics = ({ onClose, selectedBrand, selectedEvent, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    if (selectedBrand && selectedEvent) {
      fetchAnalytics();
    } else {
      setError("Please select a brand and event to view analytics");
      setLoading(false);
    }
  }, [selectedBrand, selectedEvent]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get("/analytics/summary", {
        params: {
          brandId: selectedBrand._id,
          eventId: selectedEvent._id,
        },
      });

      setStats(response.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate percentage for progress bars
  const getPercentage = (checked, total) => {
    if (!total) return 0;
    const percentage = (checked / total) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Render host summaries for custom code types
  const renderHostSummaries = (hostSummaries) => (
    <motion.div
      className="host-summaries"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {hostSummaries.map((host) => (
        <div key={host.hostId} className="host-summary">
          <div className="host-name">
            <RiUserLine />
            <span>{host.hostName}</span>
          </div>
          <div className="host-stats">
            <div className="stat">
              <span className="value">{host.totalPax}</span>
              <span className="label">Generated</span>
            </div>
            <div className="stat">
              <span className="value">{host.totalCheckedIn}</span>
              <span className="label">Checked In</span>
            </div>
            <div className="stat">
              <span className="value">{host.codesGenerated}</span>
              <span className="label">Codes</span>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${getPercentage(host.totalCheckedIn, host.totalPax)}%`,
              }}
            ></div>
          </div>
        </div>
      ))}
    </motion.div>
  );

  // Render a stat card for a single code type
  const renderStatCard = (
    title,
    generated,
    checkedIn,
    className = "",
    key = "",
    hostSummaries = null
  ) => {
    const isCustomCode = hostSummaries !== null;
    const isExpanded = expandedCard === key;

    return (
      <div
        key={key}
        className={`stat-card ${className} ${isCustomCode ? "clickable" : ""} ${
          isExpanded ? "expanded" : ""
        }`}
      >
        <div
          className="card-header"
          onClick={() => {
            if (isCustomCode) {
              setExpandedCard(isExpanded ? null : key);
            }
          }}
        >
          <h3>{title}</h3>
          <div className="stat-values">
            <div className="stat-total">
              <span className="value">{generated}</span>
              <span className="label">Generated</span>
            </div>
            <div className="stat-checked">
              <span className="value">{checkedIn}</span>
              <span className="label">Checked In</span>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${getPercentage(checkedIn, generated)}%`,
              }}
            ></div>
          </div>
        </div>

        {isCustomCode && (
          <AnimatePresence>
            {isExpanded && hostSummaries && hostSummaries.length > 0
              ? renderHostSummaries(hostSummaries)
              : isExpanded && (
                  <motion.div
                    className="host-summaries"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="empty-host-summary">
                      <p>No host data available</p>
                    </div>
                  </motion.div>
                )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  // Render a ticket category card
  const renderTicketCategory = (category) => (
    <div
      key={category.name}
      className="ticket-category"
      style={{ borderLeft: `4px solid ${category.color}` }}
    >
      <div className="category-header">
        <h4>{category.name}</h4>
        <span className="price">{category.price}€</span>
      </div>
      <div className="category-stats">
        <div className="stat">
          <span className="value">{category.stats.sold}</span>
          <span className="label">Sold</span>
        </div>
        <div className="stat">
          <span className="value">{category.stats.checkedIn}</span>
          <span className="label">Checked In</span>
        </div>
        <div className="stat">
          <span className="value">{category.stats.revenue}€</span>
          <span className="label">Revenue</span>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${getPercentage(
              category.stats.checkedIn,
              category.stats.sold
            )}%`,
            backgroundColor: category.color,
          }}
        ></div>
      </div>
    </div>
  );

  // Render tickets section with categories
  const renderTicketsSection = (tickets) => (
    <div
      className={`stat-card tickets-card clickable ${
        expandedCard === "tickets" ? "expanded" : ""
      }`}
    >
      <div
        className="card-header"
        onClick={() =>
          setExpandedCard(expandedCard === "tickets" ? null : "tickets")
        }
      >
        <h3>Tickets</h3>
        <div className="stat-values">
          <div className="stat-total">
            <span className="value">{tickets.totalSold}</span>
            <span className="label">Sold</span>
          </div>
          <div className="stat-checked">
            <span className="value">{tickets.totalCheckedIn}</span>
            <span className="label">Checked In</span>
          </div>
          <div className="stat-total">
            <span className="value">{tickets.totalRevenue}€</span>
            <span className="label">Revenue</span>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${getPercentage(
                tickets.totalCheckedIn,
                tickets.totalSold
              )}%`,
            }}
          ></div>
        </div>
      </div>

      <AnimatePresence>
        {expandedCard === "tickets" && tickets.categories.length > 0 && (
          <motion.div
            className="ticket-categories"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tickets.categories.map((category) =>
              renderTicketCategory(category)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      className="analytics-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="analytics-header">
        <h2>
          <RiFileChartLine /> Analytics
          {selectedEvent && (
            <span className="event-name"> - {selectedEvent.title}</span>
          )}
        </h2>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RiRefreshLine className={loading ? "spinning" : ""} />
          </button>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {loading ? (
          <div className="loading-state">
            <div className="loader"></div>
            <p>Loading analytics data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : !stats ? (
          <div className="empty-state">
            <p>No data available</p>
          </div>
        ) : (
          <div className="stats-grid">
            {/* Guest Codes */}
            {renderStatCard(
              "Guest Codes",
              stats.guestCodes.generated,
              stats.guestCodes.checkedIn,
              "",
              "guest-codes"
            )}

            {/* Tickets with categories */}
            {renderTicketsSection(stats.tickets)}

            {/* Dynamically render custom code types */}
            {stats.customCodeTypes &&
              stats.customCodeTypes.map((codeType, index) =>
                renderStatCard(
                  codeType.name,
                  codeType.stats.generated,
                  codeType.stats.checkedIn,
                  "",
                  `custom-code-${index}`,
                  codeType.hostSummaries
                )
              )}

            {/* Totals - Always present at the bottom */}
            <div className="stat-card total-card">
              <h3>Total Attendance</h3>
              <div className="stat-values">
                <div className="stat-total">
                  <span className="value">{stats.totals.capacity}</span>
                  <span className="label">Capacity</span>
                </div>
                <div className="stat-checked">
                  <span className="value">{stats.totals.checkedIn}</span>
                  <span className="label">Checked In</span>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${getPercentage(
                      stats.totals.checkedIn,
                      stats.totals.capacity
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Analytics;
