// DashboardMenu.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiToolsFill,
  RiBarChartFill,
  RiQrCodeFill,
  RiCodeBoxFill,
  RiTableLine,
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

  // Check if the current event is the Afro Spiti event or one of its children
  const isAfroSpitiEvent = () => {
    if (!selectedEvent) return false;

    // The specific Afro Spiti event ID
    const afroSpitiEventId = "67c9fd654bc504b8b07627e2";

    // Check if it's the specific event
    if (selectedEvent._id === afroSpitiEventId) return true;

    // Check if it's a child event (has parentEventId)
    if (selectedEvent.parentEventId === afroSpitiEventId) return true;

    // Check if the event name contains "Afro Spiti" (fallback)
    if (selectedEvent.title && selectedEvent.title.includes("Afro Spiti"))
      return true;

    return false;
  };

  // Function to check if the user should see the table system option
  const shouldShowTableSystem = () => {
    // Always show for the master user
    if (user && user._id === "65707f8da826dc13721ef735") return true;

    // Show for any admin user that's in the Afro Spiti event
    if (user && user.isAdmin && isAfroSpitiEvent()) return true;

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
          y: [0, -3, 0, 3, 0],
          boxShadow: [
            "0 4px 15px rgba(255, 200, 7, 0.25)",
            "0 6px 20px rgba(255, 200, 7, 0.5)",
            "0 4px 15px rgba(255, 200, 7, 0.25)",
          ],
        }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          y: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 2,
            ease: "easeInOut",
          },
          boxShadow: {
            repeat: Infinity,
            repeatType: "reverse",
            duration: 1,
            ease: "easeInOut",
          },
        }}
        whileHover={{
          scale: 1.1,
          x: 10,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: "fixed",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <RiToolsFill className="trigger-icon" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="menu-items"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {isMenuDisabled && (
              <div className="menu-disabled-message">
                Please select an event first
              </div>
            )}

            <div className={`menu-grid ${isMenuDisabled ? "disabled" : ""}`}>
              {permissions.analytics.view && (
                <div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowStatistic(true);
                      setIsOpen(false);
                    }
                  }}
                >
                  <RiBarChartFill />
                  <span>Analytics</span>
                </div>
              )}

              {permissions.scanner.use && (
                <div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowScanner(true);
                      setIsOpen(false);
                    }
                  }}
                >
                  <RiQrCodeFill />
                  <span>Scanner</span>
                </div>
              )}

              {/* Show Codes option if user can generate codes and there are code settings */}
              {permissions.codes.canGenerateAny && codeSettings.length > 0 && (
                <div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setCodeType("codes");
                      setIsOpen(false);
                    }
                  }}
                >
                  <RiCodeBoxFill />
                  <span>Codes</span>
                </div>
              )}

              {/* Table System menu item only for specific events/users */}
              {shouldShowTableSystem() && (
                <div
                  className={`menu-item ${isMenuDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      setShowTableSystem(true);
                      setIsOpen(false);
                    }
                  }}
                >
                  <RiTableLine />
                  <span>Tables</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMenu;
