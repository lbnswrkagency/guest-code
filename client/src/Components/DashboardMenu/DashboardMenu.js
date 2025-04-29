// DashboardMenu.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiToolsFill,
  RiBarChartFill,
  RiQrCodeFill,
  RiCodeBoxFill,
  RiTableLine,
  RiSparklingFill,
} from "react-icons/ri";
import "./DashboardMenu.scss";

const DashboardMenu = ({
  userRoles = [],
  user,
  selectedBrand,
  codeSettings = [],
  codePermissions = [],
  accessSummary = {},
  setShowStatistic,
  setShowScanner,
  setCodeType,
  setShowSettings,
  setShowDropFiles,
  setShowTableSystem,
  isOnline,
  selectedEvent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    analytics: { view: false },
    scanner: { use: false },
    codes: {
      canGenerateAny: false,
      settings: [],
    },
  });

  // Helper function to compare MongoDB IDs
  const compareIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    const str1 =
      typeof id1 === "object" ? id1._id || id1.toString() : id1.toString();
    const str2 =
      typeof id2 === "object" ? id2._id || id2.toString() : id2.toString();
    return str1 === str2;
  };

  // Function to check if the user should see the table system option
  const shouldShowTableSystem = () => {
    // Show for any user who is part of the specified brands
    if (
      selectedBrand &&
      (selectedBrand._id === "67ba051873bd89352d3ab6db" ||
        selectedBrand._id === "67d737d6e1299b18afabf4f4")
    ) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (selectedBrand && user) {
      // Check user role permissions directly
      let hasAnalyticsPermission = false;
      let hasScannerPermission = false;

      // Loop through all user roles to check permissions
      userRoles.forEach((role) => {
        // Check if role has permissions object
        if (role.permissions) {
          // Check analytics permission
          if (
            role.permissions.analytics &&
            role.permissions.analytics.view === true
          ) {
            hasAnalyticsPermission = true;
          }

          // Check scanner permission
          if (
            role.permissions.scanner &&
            role.permissions.scanner.use === true
          ) {
            hasScannerPermission = true;
          }
        }
      });

      // Build permissions object
      const effectivePermissions = {
        analytics: {
          view: hasAnalyticsPermission,
        },
        scanner: {
          use: hasScannerPermission,
        },
        codes: {
          canGenerateAny: accessSummary.canCreateCodes || false,
          canReadAny: accessSummary.canReadCodes || false,
          canEditAny: accessSummary.canEditCodes || false,
          canDeleteAny: accessSummary.canDeleteCodes || false,
          settings: codeSettings || [],
          permissions: codePermissions || [],
        },
      };

      setPermissions(effectivePermissions);
    }
  }, [
    selectedBrand,
    user,
    accessSummary,
    codeSettings,
    codePermissions,
    userRoles,
  ]);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest(".menuDashboard")) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Helper to determine which code type to use when clicking the Codes menu item
  const getDefaultCodeType = () => {
    // Look for any enabled code setting
    if (codeSettings.length > 0) {
      // Find the first available code setting that is enabled
      const firstEnabled = codeSettings.find((setting) => setting.isEnabled);
      if (firstEnabled) {
        // Prefer the name over the type for better matching
        const codeType = firstEnabled.name || firstEnabled.type;
        return codeType;
      }

      // If no enabled setting found, use the first setting
      const codeType = codeSettings[0].name || codeSettings[0].type;
      return codeType;
    }

    // If no code settings available, check permissions
    if (codePermissions.length > 0) {
      const codeType = codePermissions[0].name || codePermissions[0].type;
      return codeType;
    }

    // Default fallback
    return "guest";
  };

  // Helper to determine if menu should be disabled
  const isMenuDisabled = !selectedEvent || !selectedBrand;

  // Don't render menu if user has no brands
  if (!selectedBrand) return null;

  return (
    <div className={`menuDashboard ${isOpen ? "open" : ""}`}>
      <motion.button
        className="menu-trigger"
        onClick={handleMenuClick}
        initial={{ scale: 0, opacity: 0, x: -50 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: 0,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
        }}
        whileHover={{
          scale: 1.05,
          boxShadow: "0 0 25px rgba(255, 200, 7, 0.6)",
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Create a more sophisticated button with multiple elements */}
        <div className="menu-trigger-content">
          <div className="trigger-icon-wrapper">
            <RiSparklingFill className="sparkle-icon top-left" />
            <RiSparklingFill className="sparkle-icon top-right" />
            <RiSparklingFill className="sparkle-icon bottom-left" />
            <RiSparklingFill className="sparkle-icon bottom-right" />
            <div className="icon-background"></div>
            <RiToolsFill className="trigger-icon" />
          </div>
          <div className="trigger-text">
            <span>Tools</span>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="menu-items"
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{
              duration: 0.3,
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
          >
            {isMenuDisabled && (
              <div className="menu-disabled-message">
                Please select an event first
              </div>
            )}

            <div className={`menu-grid ${isMenuDisabled ? "disabled" : ""}`}>
              {/* Show Codes option if user can generate codes and there are code settings */}
              {permissions.codes.canGenerateAny && codeSettings.length > 0 && (
                <motion.div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setCodeType("codes");
                      setIsOpen(false);
                    }
                  }}
                  whileHover={
                    !isMenuDisabled
                      ? {
                          scale: 1.05,
                          y: -5,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        }
                      : {}
                  }
                  whileTap={!isMenuDisabled ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="menu-item-icon-wrapper">
                    <RiCodeBoxFill />
                  </div>
                  <span>Codes</span>
                </motion.div>
              )}

              {/* Table System menu item only for specific events/users */}
              {shouldShowTableSystem() && (
                <motion.div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowTableSystem(true);
                      setIsOpen(false);
                    }
                  }}
                  whileHover={
                    !isMenuDisabled
                      ? {
                          scale: 1.05,
                          y: -5,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        }
                      : {}
                  }
                  whileTap={!isMenuDisabled ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="menu-item-icon-wrapper">
                    <RiTableLine />
                  </div>
                  <span>Tables</span>
                </motion.div>
              )}

              {permissions.analytics.view && (
                <motion.div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowStatistic(true);
                      setIsOpen(false);
                    }
                  }}
                  whileHover={
                    !isMenuDisabled
                      ? {
                          scale: 1.05,
                          y: -5,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        }
                      : {}
                  }
                  whileTap={!isMenuDisabled ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="menu-item-icon-wrapper">
                    <RiBarChartFill />
                  </div>
                  <p>Analytics</p>
                </motion.div>
              )}

              {permissions.scanner.use && (
                <motion.div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowScanner(true);
                      setIsOpen(false);
                    }
                  }}
                  whileHover={
                    !isMenuDisabled
                      ? {
                          scale: 1.05,
                          y: -5,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        }
                      : {}
                  }
                  whileTap={!isMenuDisabled ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="menu-item-icon-wrapper">
                    <RiQrCodeFill />
                  </div>
                  <span>Scanner</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMenu;
