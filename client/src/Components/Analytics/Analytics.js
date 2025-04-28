import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiRefreshLine,
  RiFileChartLine,
  RiUserLine,
  RiTicket2Line,
} from "react-icons/ri";
import "./Analytics.scss";
import axiosInstance from "../../utils/axiosConfig";
import Navigation from "../Navigation/Navigation";

const Analytics = ({ onClose, selectedBrand, selectedEvent, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("subComponentMounted", {
        detail: {
          component: "Analytics",
          usesNavigation: true,
          source: "Dashboard",
        },
      })
    );

    const handleNavigationStateChange = (event) => {
      console.log("Analytics: Received navigation state change:", event.detail);
    };

    window.addEventListener(
      "navigationStateChanged",
      handleNavigationStateChange
    );

    return () => {
      window.removeEventListener(
        "navigationStateChanged",
        handleNavigationStateChange
      );
    };
  }, []);

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
      console.log(
        "Fetching analytics for brand:",
        selectedBrand._id,
        "event:",
        selectedEvent._id
      );

      const response = await axiosInstance.get("/analytics/summary", {
        params: {
          brandId: selectedBrand._id,
          eventId: selectedEvent._id,
        },
      });

      // Process the response data
      const data = response.data;
      console.log(
        "Raw analytics data received:",
        JSON.stringify(data, null, 2)
      );

      // If there are ticket categories, ensure each has a paymentMethod
      if (data.tickets && data.tickets.categories) {
        // Log tickets data
        console.log(
          "Tickets data before processing:",
          JSON.stringify(data.tickets, null, 2)
        );

        // Check if paymentMethod exists in the response
        console.log("Payment method in response:", data.tickets.paymentMethod);

        // Get the event's paymentMethod (all tickets should have the same payment method)
        const paymentMethod = data.tickets.paymentMethod || "online";
        console.log("Using payment method:", paymentMethod);

        // Apply paymentMethod to all categories if not already present
        data.tickets.categories = data.tickets.categories.map((category) => {
          console.log(
            "Processing category:",
            category.name,
            "Current paymentMethod:",
            category.paymentMethod
          );
          return {
            ...category,
            paymentMethod: category.paymentMethod || paymentMethod,
          };
        });

        // Ensure the main tickets object has paymentMethod
        data.tickets.paymentMethod = paymentMethod;

        console.log(
          "Tickets data after processing:",
          JSON.stringify(data.tickets, null, 2)
        );
      }

      setStats(data);
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
          <div className="card-header-content">
            <div className="card-icon-wrapper">
              <RiFileChartLine className="card-icon" />
            </div>
            <h3>{title}</h3>
            {isCustomCode && (
              <div className="card-toggle">
                <span className="toggle-icon">⌵</span>
              </div>
            )}
          </div>

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
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${getPercentage(checkedIn, generated)}%`,
                }}
              ></div>
            </div>
            <div className="progress-percentage">
              {getPercentage(checkedIn, generated).toFixed(0)}%
            </div>
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
  const renderTicketCategory = (category) => {
    console.log(
      "Rendering category:",
      category.name,
      "Payment method:",
      category.paymentMethod
    );

    // Calculate revenue based on payment method
    let revenue = category.stats.revenue;
    if (category.paymentMethod === "atEntrance") {
      revenue = category.stats.checkedIn * category.price;
      console.log(
        "atEntrance revenue calculation:",
        `${category.stats.checkedIn} × ${category.price} = ${revenue}`
      );
    }

    return (
      <div
        key={category.name}
        className="ticket-category"
        style={{ borderLeft: `4px solid ${category.color}` }}
      >
        <div className="category-header">
          <div className="category-icon-wrapper">
            <RiTicket2Line
              className="category-icon"
              style={{ color: category.color }}
            />
          </div>
          <h4>{category.name}</h4>
          <span className="price">{category.price}€</span>
        </div>
        <div className="category-stats">
          <div className="stat">
            <span className="value">{category.stats.sold}</span>
            <span className="label">
              {category.paymentMethod === "atEntrance" ? "Generated" : "Sold"}
            </span>
          </div>
          <div className="stat">
            <span className="value">{category.stats.checkedIn}</span>
            <span className="label">Checked In</span>
          </div>
          <div className="stat">
            <span className="value">{revenue}€</span>
            <span className="label">Revenue</span>
          </div>
        </div>
        <div className="progress-container">
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
          <div className="progress-percentage">
            {getPercentage(
              category.stats.checkedIn,
              category.stats.sold
            ).toFixed(0)}
            %
          </div>
        </div>
      </div>
    );
  };

  // Render tickets section with categories
  const renderTicketsSection = (tickets) => {
    console.log(
      "Rendering tickets section. Payment method:",
      tickets.paymentMethod
    );

    // Calculate total revenue based on payment method
    let totalRevenue = tickets.totalRevenue;
    if (tickets.paymentMethod === "atEntrance") {
      // For atEntrance, revenue is only from checked-in tickets
      totalRevenue = tickets.categories.reduce((sum, category) => {
        return sum + category.stats.checkedIn * category.price;
      }, 0);
      console.log("atEntrance total revenue calculation:", totalRevenue);
    }

    return (
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
          <div className="card-header-content">
            <div className="card-icon-wrapper">
              <RiTicket2Line className="card-icon" />
            </div>
            <h3>Tickets</h3>
            <div className="card-toggle">
              <span className="toggle-icon">⌵</span>
            </div>
          </div>

          <div className="stat-values">
            <div className="stat-total">
              <span className="value">{tickets.totalSold}</span>
              <span className="label">
                {tickets.paymentMethod === "atEntrance" ? "Generated" : "Sold"}
              </span>
            </div>
            <div className="stat-checked">
              <span className="value">{tickets.totalCheckedIn}</span>
              <span className="label">Checked In</span>
            </div>
            <div className="stat-revenue">
              <span className="value">{totalRevenue}€</span>
              <span className="label">Revenue</span>
            </div>
          </div>
          <div className="progress-container">
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
            <div className="progress-percentage">
              {getPercentage(tickets.totalCheckedIn, tickets.totalSold).toFixed(
                0
              )}
              %
            </div>
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
  };

  return (
    <motion.div
      className="analytics-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Navigation onBack={onClose} />

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
            {stats.guestCodes &&
              renderStatCard(
                "Guest Codes",
                stats.guestCodes.generated,
                stats.guestCodes.checkedIn,
                "guest-card",
                "guest-codes"
              )}

            {/* Tickets with categories */}
            {stats.tickets && renderTicketsSection(stats.tickets)}

            {/* Dynamically render custom code types */}
            {stats.customCodeTypes &&
              stats.customCodeTypes.map((codeType, index) =>
                renderStatCard(
                  codeType.name,
                  codeType.stats.generated,
                  codeType.stats.checkedIn,
                  `custom-code-card custom-code-${index % 5}`,
                  `custom-code-${index}`,
                  codeType.hostSummaries
                )
              )}

            {/* Totals - Always present at the bottom */}
            <div className="stat-card total-card">
              <div className="card-header">
                <div className="card-header-content">
                  <div className="card-icon-wrapper">
                    <RiUserLine className="card-icon" />
                  </div>
                  <h3>Total Attendance</h3>
                </div>

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
                <div className="progress-container">
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
                  <div className="progress-percentage">
                    {getPercentage(
                      stats.totals.checkedIn,
                      stats.totals.capacity
                    ).toFixed(0)}
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Analytics;
