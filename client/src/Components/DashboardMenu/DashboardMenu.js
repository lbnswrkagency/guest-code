// DashboardMenu.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiToolsFill,
  RiBarChartFill,
  RiQrCodeFill,
  RiCodeBoxFill,
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

  return (
    <div className={`menuDashboard ${isOpen ? "open" : ""}`}>
      <button className="menu-trigger" onClick={handleMenuClick}>
        <RiToolsFill className="trigger-icon" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="menu-items"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="menu-grid">
              {permissions.analytics.view && (
                <div
                  className="menu-item"
                  onClick={() => {
                    setShowStatistic(true);
                    setIsOpen(false);
                  }}
                >
                  <RiBarChartFill />
                  <span>Analytics</span>
                </div>
              )}

              {permissions.scanner.use && (
                <div
                  className="menu-item"
                  onClick={() => {
                    setShowScanner(true);
                    setIsOpen(false);
                  }}
                >
                  <RiQrCodeFill />
                  <span>Scanner</span>
                </div>
              )}

              {/* Show Codes option if user can generate codes and there are code settings */}
              {permissions.codes.canGenerateAny && codeSettings.length > 0 && (
                <div
                  className="menu-item"
                  onClick={() => {
                    setCodeType("codes");
                    setIsOpen(false);
                  }}
                >
                  <RiCodeBoxFill />
                  <span>Codes</span>
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
