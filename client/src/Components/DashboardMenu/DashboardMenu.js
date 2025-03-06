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

  // Debug logging to verify we're receiving data
  useEffect(() => {
    console.log("🧰 DashboardMenu received:", {
      userRoles: userRoles.length,
      codeSettings: codeSettings.length,
      codePermissions: codePermissions.length,
      accessSummary,
      selectedBrand: selectedBrand?.name,
    });
  }, [userRoles, codeSettings, codePermissions, accessSummary, selectedBrand]);

  useEffect(() => {
    if (selectedBrand && user) {
      // Use the access summary directly instead of recalculating permissions
      const effectivePermissions = {
        analytics: {
          view: accessSummary.hasAnalyticsPermission || false,
        },
        scanner: {
          use: accessSummary.hasScannerPermission || false,
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

      console.log(
        "🔍 DashboardMenu effective permissions:",
        effectivePermissions
      );
      setPermissions(effectivePermissions);
    }
  }, [selectedBrand, user, accessSummary, codeSettings, codePermissions]);

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
    console.group("🔍 MENU: Getting Default Code Type");
    console.log(
      "Code Settings:",
      codeSettings.length > 0
        ? codeSettings.map((s) => ({
            name: s.name,
            type: s.type,
            codeType: s.codeType,
            isEnabled: s.isEnabled,
          }))
        : "None"
    );
    console.log(
      "Code Permissions:",
      codePermissions.length > 0
        ? codePermissions.map((p) => ({
            type: p.type,
            generate: p.generate,
          }))
        : "None"
    );
    console.log(
      "Selected Brand:",
      selectedBrand
        ? {
            _id: selectedBrand._id,
            name: selectedBrand.name,
          }
        : "undefined"
    );
    console.groupEnd();

    // Look for any enabled code setting
    if (codeSettings.length > 0) {
      // Find the first available code setting that is enabled
      const firstEnabled = codeSettings.find((setting) => setting.isEnabled);
      if (firstEnabled) {
        console.log(
          `📋 Using first enabled code setting: ${
            firstEnabled.name || firstEnabled.type || firstEnabled.codeType
          }`
        );
        return firstEnabled.type || firstEnabled.codeType || "guest";
      }

      // If no enabled setting found, use the first setting
      console.log(
        `📋 Using first code setting (not enabled): ${
          codeSettings[0].name ||
          codeSettings[0].type ||
          codeSettings[0].codeType
        }`
      );
      return codeSettings[0].type || codeSettings[0].codeType || "guest";
    }

    // If no code settings available, check permissions
    if (codePermissions.length > 0) {
      console.log(
        `📋 No code settings, using permission type: ${codePermissions[0].type}`
      );
      return codePermissions[0].type || "guest";
    }

    // Default fallback
    console.log("📋 No code settings or permissions, defaulting to guest");
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
                    const defaultType = getDefaultCodeType();
                    console.group("🎟️ MENU: Setting code type");
                    console.log("Code type:", defaultType);
                    console.log(
                      "Selected Brand:",
                      selectedBrand
                        ? {
                            _id: selectedBrand._id,
                            name: selectedBrand.name,
                          }
                        : "undefined"
                    );
                    console.log("Code Settings:", codeSettings.length);
                    console.log("Code Permissions:", codePermissions.length);
                    console.groupEnd();
                    setCodeType(defaultType);
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
