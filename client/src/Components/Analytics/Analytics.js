import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiRefreshLine,
  RiFileChartLine,
  RiUserLine,
  RiTicket2Line,
  RiSwordLine,
  RiMailLine,
} from "react-icons/ri";
import "./Analytics.scss";
import axiosInstance from "../../utils/axiosConfig";
import Navigation from "../Navigation/Navigation";

const Analytics = ({ onClose, selectedBrand, selectedEvent, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedBattleCategory, setExpandedBattleCategory] = useState(null);

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

    const handleNavigationStateChange = () => {
      // Navigation state handler
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
      const response = await axiosInstance.get("/analytics/summary", {
        params: {
          brandId: selectedBrand._id,
          eventId: selectedEvent._id,
        },
      });

      // Process the response data
      const data = response.data;

      // If there are ticket categories, ensure each has a paymentMethod
      if (data.tickets && data.tickets.categories) {
        // Get the event's paymentMethod (all tickets should have the same payment method)
        const paymentMethod = data.tickets.paymentMethod || "online";

        // Apply paymentMethod to all categories if not already present
        data.tickets.categories = data.tickets.categories.map((category) => ({
          ...category,
          paymentMethod: category.paymentMethod || paymentMethod,
        }));

        // Ensure the main tickets object has paymentMethod
        data.tickets.paymentMethod = paymentMethod;
      }

      setStats(data);
    } catch (err) {
      // Set more specific error message based on status code
      if (err.response?.status === 403) {
        setError("Access denied. You don't have permission to view analytics for this event.");
      } else if (err.response?.status === 404) {
        setError("Event not found or does not belong to this brand.");
      } else if (err.response?.data?.message) {
        setError(`Failed to load analytics: ${err.response.data.message}`);
      } else {
        setError("Failed to load analytics data. Please try again.");
      }
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
    // Calculate revenue based on payment method
    let revenue = category.stats.revenue;
    if (category.paymentMethod === "atEntrance") {
      revenue = category.stats.checkedIn * category.price;
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
            <span className="value">{revenue.toFixed(2)}€</span>
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
    // Calculate total revenue based on payment method
    let totalRevenue = tickets.totalRevenue;
    if (tickets.paymentMethod === "atEntrance") {
      // For atEntrance, revenue is only from checked-in tickets
      totalRevenue = tickets.categories.reduce((sum, category) => {
        return sum + category.stats.checkedIn * category.price;
      }, 0);
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
          </div>
          <div className="stat-revenue-row">
            <span className="value">{totalRevenue.toFixed(2)}€</span>
            <span className="label">Revenue</span>
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

  // Render individual battle signup
  const renderBattleSignup = (signup) => {
    const firstName = signup.name.split(' ')[0];
    const lastName = signup.name.split(' ').slice(1).join(' ');
    
    return (
      <div key={signup._id} className="battle-signup-item">
        <div className="signup-header">
          <div className="signup-name">
            <span className="first-name">{firstName}</span>
            {lastName && <span className="last-name">{lastName}</span>}
          </div>
          <div className="signup-social">
            {signup.instagram && (
              <span className="instagram">@{signup.instagram.replace('@', '')}</span>
            )}
          </div>
          <div className="signup-status">
            <span className={`status-indicator ${signup.status}`}>
              {signup.status}
            </span>
          </div>
        </div>
        
        <div className="signup-details">
          <div className="detail-item">
            <span className="label">Participants:</span>
            <span className="value">{signup.participantCount}</span>
          </div>
          <div className="detail-item">
            <span className="label">Checked In:</span>
            <span className="value">{signup.checkedIn}</span>
          </div>
          {signup.participants && signup.participants.length > 0 && (
            <div className="team-members">
              <span className="team-label">Team:</span>
              <div className="team-list">
                {signup.participants.map((participant, idx) => (
                  <span key={idx} className="team-member">
                    {participant.name}
                    {participant.instagram && ` (@${participant.instagram.replace('@', '')})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render battle category card
  const renderBattleCategory = (category) => {
    const isExpanded = expandedBattleCategory === category.name;
    
    return (
      <div key={category.name} className="battle-category">
        <div 
          className="category-header clickable"
          onClick={() => setExpandedBattleCategory(isExpanded ? null : category.name)}
        >
          <div className="category-icon-wrapper">
            <RiSwordLine className="category-icon" style={{ color: "#e91e63" }} />
          </div>
          <h4>{category.name}</h4>
          <div className="status-badges">
            <span className="status-badge confirmed">{category.confirmed} confirmed</span>
            <span className="status-badge pending">{category.pending} pending</span>
            {category.declined > 0 && (
              <span className="status-badge declined">{category.declined} declined</span>
            )}
          </div>
          <div className="expand-toggle">
            <span className="toggle-icon">⌵</span>
          </div>
        </div>
        
        <div className="category-stats">
          <div className="stat">
            <span className="value">{category.total}</span>
            <span className="label">Signups</span>
          </div>
          <div className="stat">
            <span className="value">{category.checkedIn}</span>
            <span className="label">Checked In</span>
          </div>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${getPercentage(category.checkedIn, category.participants)}%`,
                backgroundColor: "#e91e63",
              }}
            ></div>
          </div>
          <div className="progress-percentage">
            {getPercentage(category.checkedIn, category.participants).toFixed(0)}%
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && category.signups && category.signups.length > 0 && (
            <motion.div
              className="battle-signups-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {category.signups.map((signup) => renderBattleSignup(signup))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render battle section
  const renderBattleSection = (battle) => {
    return (
      <div
        className={`stat-card battle-card clickable ${
          expandedCard === "battle" ? "expanded" : ""
        }`}
      >
        <div
          className="card-header"
          onClick={() =>
            setExpandedCard(expandedCard === "battle" ? null : "battle")
          }
        >
          <div className="card-header-content">
            <div className="card-icon-wrapper">
              <RiSwordLine className="card-icon" />
            </div>
            <h3>Battle Signups</h3>
            <div className="card-toggle">
              <span className="toggle-icon">⌵</span>
            </div>
          </div>

          <div className="stat-values">
            <div className="stat-total">
              <span className="value">{battle.totalSignups}</span>
              <span className="label">Signups</span>
            </div>
            <div className="stat-checked">
              <span className="value">{battle.totalCheckedIn}</span>
              <span className="label">Checked In</span>
            </div>
          </div>
          
          <div className="battle-status-overview">
            <div className="status-item">
              <span className="status-value confirmed">{battle.statusDistribution.confirmed}</span>
              <span className="status-label">Confirmed</span>
            </div>
            <div className="status-item">
              <span className="status-value pending">{battle.statusDistribution.pending}</span>
              <span className="status-label">Pending</span>
            </div>
            {battle.statusDistribution.declined > 0 && (
              <div className="status-item">
                <span className="status-value declined">{battle.statusDistribution.declined}</span>
                <span className="status-label">Declined</span>
              </div>
            )}
          </div>

          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${getPercentage(battle.totalCheckedIn, battle.totalParticipants)}%`,
                  backgroundColor: "#e91e63",
                }}
              ></div>
            </div>
            <div className="progress-percentage">
              {getPercentage(battle.totalCheckedIn, battle.totalParticipants).toFixed(0)}%
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expandedCard === "battle" && battle.categories.length > 0 && (
            <motion.div
              className="battle-categories"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {battle.categories.map((category) => renderBattleCategory(category))}
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

            {/* Tickets with categories - only show if sold > 0 */}
            {stats.tickets && stats.tickets.totalSold > 0 && renderTicketsSection(stats.tickets)}

            {/* Battle signups - only show if battle is enabled and has signups */}
            {stats.battle && stats.battle.totalSignups > 0 && renderBattleSection(stats.battle)}

            {/* Personal Invitations - only shown to developers */}
            {stats.invitations && stats.invitations.count > 0 &&
              renderStatCard(
                "Personal Invitations",
                stats.invitations.totalPax,
                stats.invitations.checkedIn,
                "invitation-card",
                "invitations"
              )}

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
