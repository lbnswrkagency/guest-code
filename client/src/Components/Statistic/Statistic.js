import React, { useState } from "react";
import "./Statistic.scss";
import moment from "moment";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";

function Statistic({
  counts,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  user,
  onClose,
}) {
  const [detailsVisible, setDetailsVisible] = useState({});

  const toggleDetailsVisibility = (type) => {
    if (hasPermission(type) && counts[type] && counts[type].length > 0) {
      setDetailsVisible((prev) => ({
        ...Object.keys(prev).reduce((acc, key) => {
          acc[key] = false; // Reset all to false initially
          return acc;
        }, {}),
        [type]: !prev[type], // Toggle the clicked one only if conditions are met
      }));
    }
  };

  const displayDate = currentEventDate.format("DD MMM YYYY");

  // Function to calculate total generated and used codes for a specific type
  const calculateTotals = (type) => {
    if (!Array.isArray(counts[type])) {
      return { total: 0, used: 0 };
    }
    const total = counts[type].reduce(
      (acc, curr) => acc + (curr.total || 0),
      0
    );
    const used = counts[type].reduce((acc, curr) => acc + (curr.used || 0), 0);
    return { total, used };
  };

  // Data structure for dynamic content generation
  const sections = [
    {
      type: "guestCounts",
      title: "Guest Codes",
      permissions: ["isStaff", "isAdmin"],
    },
    {
      type: "friendsCounts",
      title: "Friends Codes",
      permissions: ["isStaff", "isAdmin"],
    },
    {
      type: "backstageCounts",
      title: "Backstage Codes",
      permissions: ["isAdmin"],
    },
    { type: "tableCounts", title: "Table Codes", permissions: ["isAdmin"] },
    {
      type: "invitationCounts",
      title: "Invitation Codes [BETA]",
      permissions: ["isAdmin"],
    },
  ];

  const overallTotals = sections.reduce(
    (acc, { type }) => {
      const { total, used } = calculateTotals(type);
      acc.totalGenerated += total;
      acc.totalUsed += used;
      return acc;
    },
    { totalGenerated: 0, totalUsed: 0 }
  );

  const hasPermission = (type) => {
    const section = sections.find((section) => section.type === type);
    const hasPermissionsDefined = !!section?.permissions;
    const hasUserPermission = section?.permissions?.some(
      (permission) => user[permission]
    );
    const hasCounts = !!counts[type];
    const hasData = counts[type]?.length > 0;

    return hasPermissionsDefined && hasUserPermission && hasCounts && hasData;
  };

  return (
    <div className="statistic">
      <div className="statistic-wrapper">
        <Navigation onBack={onClose} />
        <h1 className="statistic-title">Statistic</h1>
        <div className="statistic-container">
          <div className="statistic-navigation">
            <button
              className="statistic-navigation-button"
              onClick={onPrevWeek}
              disabled={isStartingEvent}
              style={{ opacity: isStartingEvent ? 0 : 1 }}
            >
              <img
                src="/image/arrow-left.svg"
                alt=""
                className="statistic-navigation-arrow-left"
              />
            </button>
            <p className="statistic-navigation-date">{displayDate}</p>
            <button
              className="statistic-navigation-button"
              onClick={onNextWeek}
            >
              <img
                src="/image/arrow-right.svg"
                alt=""
                className="statistic-navigation-arrow-right"
              />
            </button>
          </div>

          <img className="statistic-logo" src="/image/logo.svg" alt="" />

          {sections.map(({ type, title }) => (
            <div key={type} className="statistic-code">
              <h2 className="statistic-code-title">{title}</h2>
              <div
                className="statistic-code-container"
                onClick={() =>
                  hasPermission(type) && toggleDetailsVisibility(type)
                }
              >
                <div className="statistic-code-container-header">
                  <div className="statistic-code-container-header-title">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Generate</h2>
                  </div>
                  <div className="statistic-code-container-header-title">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Check-In</h2>
                  </div>
                </div>

                {detailsVisible[type] && (
                  <div className="statistic-code-details">
                    {counts[type]?.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{count.name}</p>
                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>
                        <div className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </div>
                      </div>
                    ))}
                    <div className="statistic-code-details-footer">
                      <div className="statistic-code-details-footer-wrapper">
                        <img src="/image/generate.svg" alt="" />
                        <h2>Total</h2>
                      </div>
                      <div className="statistic-code-details-footer-wrapper">
                        <img src="/image/checked.svg" alt="" />
                        <h2>Total</h2>
                      </div>
                    </div>
                  </div>
                )}

                <div className="statistic-code-container-footer">
                  <div className="statistic-code-container-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <p>{calculateTotals(type).total}</p>
                  </div>
                  <div className="statistic-code-container-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <p className="checked">{calculateTotals(type).used}</p>
                  </div>
                </div>
                {hasPermission(type) &&
                  counts[type] &&
                  counts[type].length > 0 && (
                    <img
                      src="/image/arrow-up.svg"
                      alt=""
                      className={`statistic-code-details-arrow ${
                        !detailsVisible[type] ? "rotated" : ""
                      }`}
                      onClick={() => toggleDetailsVisibility(type)}
                    />
                  )}
              </div>
            </div>
          ))}

          <div className="statistic-code">
            <h2 className="statistic-code-title">Total</h2>
            <div className="statistic-code-container">
              <div className="statistic-code-container-header">
                <div className="statistic-code-container-header-title">
                  <img src="/image/generate.svg" alt="" />
                  <h2>Generate</h2>
                </div>
                <div className="statistic-code-container-header-title">
                  <img src="/image/checked.svg" alt="" />
                  <h2>Check-In</h2>
                </div>
              </div>

              <div className="statistic-code-container-footer">
                <div className="statistic-code-container-footer-wrapper">
                  <img src="/image/generate.svg" alt="" />
                  <p>{overallTotals.totalGenerated}</p>
                </div>
                <div className="statistic-code-container-footer-wrapper">
                  <img src="/image/checked.svg" alt="" />
                  <p className="checked">{overallTotals.totalUsed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Statistic;
