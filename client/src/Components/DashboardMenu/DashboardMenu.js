// DashboardMenu.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiToolsFill, RiBarChartFill, RiQrCodeFill } from "react-icons/ri";
import "./DashboardMenu.scss";

const DashboardMenu = ({
  userRoles = [],
  user,
  selectedBrand,
  codeSettings = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userPermissions, setUserPermissions] = useState(null);

  // Handler to toggle menu open/close
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Handler for when clicking outside the menu
  const handleClickOutside = (e) => {
    if (e.target.closest(".menuDashboard")) {
      return;
    }
    setIsOpen(false);
  };

  // Determine user's role and permissions in the selected brand
  // This mirrors the logic in DashboardHeader but adds permission processing
  useEffect(() => {
    if (selectedBrand && user?._id) {
      console.log(
        "[DashboardMenu] Determining user role for brand:",
        selectedBrand.name
      );
      console.log("[DashboardMenu] User ID:", user._id);
      console.log("[DashboardMenu] User info:", {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        isScanner: user.isScanner,
      });
      console.log("[DashboardMenu] Brand owner:", selectedBrand.owner);
      console.log("[DashboardMenu] Brand team:", selectedBrand.team);
      console.log("[DashboardMenu] Code settings:", codeSettings);

      // Filter roles for this brand
      const brandRoles = userRoles.filter(
        (role) =>
          role.brandId === selectedBrand._id ||
          (typeof role.brandId === "object" &&
            role.brandId._id === selectedBrand._id)
      );

      console.log("[DashboardMenu] Filtered roles for this brand:", brandRoles);

      // Initialize permissions object
      let effectivePermissions = {
        isOwner: false,
        analytics: { view: false },
        scanner: { use: false },
        events: {
          create: false,
          edit: false,
          delete: false,
          view: false,
        },
        team: {
          manage: false,
          view: false,
        },
        codes: {},
      };

      // Check if user is the brand owner
      if (
        selectedBrand.owner === user._id ||
        (typeof selectedBrand.owner === "object" &&
          selectedBrand.owner._id === user._id)
      ) {
        console.log("[DashboardMenu] User is the OWNER of this brand");
        setUserRole(`Owner ${selectedBrand.name}`);

        // Owners have all permissions
        effectivePermissions = {
          isOwner: true,
          analytics: { view: true },
          scanner: { use: true },
          events: {
            create: true,
            edit: true,
            delete: true,
            view: true,
          },
          team: {
            manage: true,
            view: true,
          },
          codes: codeSettings.reduce((acc, setting) => {
            acc[setting.type] = { generate: true, unlimited: true };
            return acc;
          }, {}),
        };
      }
      // Check if user is a team member
      else if (selectedBrand.team && Array.isArray(selectedBrand.team)) {
        const teamMember = selectedBrand.team.find(
          (member) =>
            member.user === user._id ||
            (typeof member.user === "object" && member.user._id === user._id)
        );

        if (teamMember) {
          // Format role name: first letter uppercase, rest lowercase
          let formattedRole = "Member";

          if (teamMember.role) {
            formattedRole =
              teamMember.role.charAt(0).toUpperCase() +
              teamMember.role.slice(1).toLowerCase();
          }

          console.log("[DashboardMenu] User is a TEAM MEMBER with role:", {
            originalRole: teamMember.role,
            formattedRole: formattedRole,
            teamMemberData: teamMember,
          });

          setUserRole(`${formattedRole} ${selectedBrand.name}`);

          // Process role-based permissions
          if (brandRoles.length > 0) {
            brandRoles.forEach((role) => {
              // Combine permissions from all roles
              if (role.permissions) {
                // Analytics permissions
                if (role.permissions.analytics?.view) {
                  effectivePermissions.analytics.view = true;
                }

                // Scanner permissions
                if (role.permissions.scanner?.use) {
                  effectivePermissions.scanner.use = true;
                }

                // Events permissions
                if (role.permissions.events) {
                  Object.keys(role.permissions.events).forEach((action) => {
                    if (role.permissions.events[action]) {
                      effectivePermissions.events[action] = true;
                    }
                  });
                }

                // Team permissions
                if (role.permissions.team) {
                  Object.keys(role.permissions.team).forEach((action) => {
                    if (role.permissions.team[action]) {
                      effectivePermissions.team[action] = true;
                    }
                  });
                }

                // Code permissions
                if (role.permissions.codes) {
                  // Handle both Map and Object types
                  const codesObj =
                    role.permissions.codes instanceof Map
                      ? Object.fromEntries(role.permissions.codes)
                      : role.permissions.codes;

                  Object.keys(codesObj).forEach((codeType) => {
                    if (!effectivePermissions.codes[codeType]) {
                      effectivePermissions.codes[codeType] = {};
                    }

                    // Copy permissions for this code type
                    Object.keys(codesObj[codeType]).forEach((perm) => {
                      effectivePermissions.codes[codeType][perm] =
                        codesObj[codeType][perm];
                    });
                  });
                }
              }
            });
          }

          // Legacy fallbacks for backward compatibility
          if (user.isAdmin) {
            effectivePermissions.analytics.view = true;
            effectivePermissions.scanner.use = true;
          }

          if (user.isScanner) {
            effectivePermissions.scanner.use = true;
          }
        }
      }
      // Default role
      else {
        console.log(
          "[DashboardMenu] No specific role found, defaulting to MEMBER"
        );
        setUserRole(`Member ${selectedBrand.name}`);

        // Process role-based permissions from assigned roles if any
        if (brandRoles.length > 0) {
          // Process permissions (same logic as above)
          // This is intentionally repeated for clarity
          brandRoles.forEach((role) => {
            // Process permissions same as above...
          });
        }

        // Legacy fallbacks
        if (user.isAdmin) {
          effectivePermissions.analytics.view = true;
          effectivePermissions.scanner.use = true;
        }

        if (user.isScanner) {
          effectivePermissions.scanner.use = true;
        }
      }

      // Store the effective permissions
      setUserPermissions(effectivePermissions);

      // Log the final effective permissions
      console.log(
        "[DashboardMenu] Final effective permissions:",
        effectivePermissions
      );
      console.log(
        "[DashboardMenu] User can view analytics:",
        effectivePermissions.analytics.view
      );
      console.log(
        "[DashboardMenu] User can use scanner:",
        effectivePermissions.scanner.use
      );
      console.log(
        "[DashboardMenu] User can create events:",
        effectivePermissions.events.create
      );
      console.log(
        "[DashboardMenu] User can manage team:",
        effectivePermissions.team.manage
      );
      console.log(
        "[DashboardMenu] User's code generation permissions:",
        effectivePermissions.codes
      );
    } else {
      console.log("[DashboardMenu] No brand or user selected, clearing role");
      setUserRole("");
      setUserPermissions(null);
    }
  }, [selectedBrand, user, userRoles, codeSettings]);

  // Add event listener for outside clicks when menu is open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`menuDashboard ${isOpen ? "open" : ""}`}>
      {/* Menu Trigger Button */}
      <button className="menu-trigger" onClick={toggleMenu}>
        <RiToolsFill className="trigger-icon" />
      </button>

      {/* Menu Items */}
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
              {/* Static Statistics Item */}
              <div className="menu-item">
                <RiBarChartFill />
                <span>Statistics</span>
              </div>

              {/* Static Scanner Item */}
              <div className="menu-item">
                <RiQrCodeFill />
                <span>Scanner</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMenu;
