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
  setShowStatistic,
  setShowScanner,
  setCodeType,
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
      console.log(
        "[DashboardMenu] Determining permissions for brand:",
        selectedBrand.name
      );

      // Initialize permissions
      let effectivePermissions = {
        analytics: { view: false },
        scanner: { use: false },
        codes: {
          canGenerateAny: false,
          settings: codeSettings,
        },
      };

      // Check if user is owner
      const isOwner = compareIds(selectedBrand.owner, user._id);

      if (isOwner) {
        console.log("[DashboardMenu] User is owner - granting all permissions");
        effectivePermissions = {
          analytics: { view: true },
          scanner: { use: true },
          codes: {
            canGenerateAny: true,
            settings: codeSettings,
          },
        };
      } else {
        // Find user's role in team
        const teamMember = selectedBrand.team?.find((member) =>
          compareIds(member.user, user._id)
        );

        if (teamMember) {
          console.log(
            "[DashboardMenu] User is team member with role:",
            teamMember.role
          );

          // Find role definition
          const roleDefinition = userRoles.find(
            (role) =>
              role.name === teamMember.role &&
              compareIds(role.brandId, selectedBrand._id)
          );

          if (roleDefinition?.permissions) {
            console.log(
              "[DashboardMenu] Found role permissions:",
              roleDefinition.permissions
            );

            effectivePermissions.analytics.view =
              roleDefinition.permissions.analytics?.view || false;
            effectivePermissions.scanner.use =
              roleDefinition.permissions.scanner?.use || false;

            // Check if user can generate any type of code
            const canGenerateAny = Object.values(
              roleDefinition.permissions.codes || {}
            ).some((codePerm) => codePerm.generate);

            effectivePermissions.codes.canGenerateAny = canGenerateAny;
          }
        }
      }

      console.log("[DashboardMenu] Final permissions:", effectivePermissions);
      setPermissions(effectivePermissions);
    }
  }, [selectedBrand, user, userRoles, codeSettings]);

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

              {permissions.codes.canGenerateAny && (
                <div
                  className="menu-item"
                  onClick={() => {
                    setCodeType("guest"); // Default to guest type, CodeGenerator will handle available types
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
