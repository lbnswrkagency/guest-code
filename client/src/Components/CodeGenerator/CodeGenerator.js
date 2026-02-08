import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./CodeGenerator.scss";
import CodeManagement from "../CodeManagement/CodeManagement";
import { BsPeopleFill } from "react-icons/bs";
import {
  RiCodeBoxFill,
  RiCloseLine,
  RiRefreshLine,
  RiCodeLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiHeartLine,
  RiStarLine,
  RiFireLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
  RiAddLine,
} from "react-icons/ri";
import { componentCleanup } from "../../utils/layoutHelpers";

// Icon map for dynamic icon rendering
const ICON_MAP = {
  RiCodeLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiHeartLine,
  RiStarLine,
  RiFireLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
  RiCodeBoxFill,
};

function CodeGenerator({
  user,
  onClose,
  type,
  refreshCounts,
  codeSettings = [],
  selectedBrand,
  selectedEvent,
  onEventDataUpdate,
}) {
  const { showSuccess, showError, showLoading } = useToast();
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [condition, setCondition] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [icon, setIcon] = useState("");
  const [activeSetting, setActiveSetting] = useState(null);
  const [availableSettings, setAvailableSettings] = useState([]);
  const [selectedCodeType, setSelectedCodeType] = useState(null);
  const [maxPeopleOptions, setMaxPeopleOptions] = useState([1]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCodes, setUserCodes] = useState({});
  const [totalCodesCount, setTotalCodesCount] = useState(0);

  // Initialize component with settings and user permissions
  useEffect(() => {
    // Get user permissions using unified format
    // Backend now normalizes all permissions to plain objects (no Map conversion needed)
    const effectivePermissions =
      selectedEvent?.coHostBrandInfo?.effectivePermissions ||
      selectedBrand?.role?.permissions;

    // Debug logging for permission initialization
    console.log("[CodeGenerator Init] Permission sources:", {
      isCoHostedEvent: !!selectedEvent?.coHostBrandInfo,
      coHostBrandInfo: selectedEvent?.coHostBrandInfo,
      effectivePermissions: selectedEvent?.coHostBrandInfo?.effectivePermissions,
      brandRolePermissions: selectedBrand?.role?.permissions,
      finalEffectivePermissions: effectivePermissions,
    });

    // Get codes permissions (always a plain object now)
    const userPermissions = effectivePermissions?.codes || {};
    console.log("[CodeGenerator Init] Code permissions:", userPermissions);

    // Use embedded codeSettings for co-hosted events, fall back to Redux for regular events
    // Co-hosted events receive codeSettings embedded in selectedEvent from backend
    const sourceCodeSettings = selectedEvent?.codeSettings?.length > 0
      ? selectedEvent.codeSettings
      : codeSettings;

    // Filter for custom codes that are enabled AND have brandId (excludes old legacy codes)
    // New consolidated CodeSettings model requires brandId
    const customCodeSettings = sourceCodeSettings.filter(
      (setting) => setting.isEnabled === true && setting.brandId
    );

    // Create a map to track unique settings by name
    const uniqueSettingsMap = new Map();

    // Process each setting, keeping only the first occurrence of each name
    customCodeSettings.forEach((setting) => {
      if (!uniqueSettingsMap.has(setting.name)) {
        uniqueSettingsMap.set(setting.name, setting);
      }
    });

    // Convert map back to array
    const uniqueCodeSettings = Array.from(uniqueSettingsMap.values());

    // Check if user is founder (has full access to all codes)
    const isFounder = selectedBrand?.role?.isFounder === true;

    // Filter settings based on user permissions
    // Permission key format: codeSettingId (primary) or codeName (legacy fallback)
    const permittedSettings = uniqueCodeSettings.filter((setting) => {
      // Founders have access to all codes
      if (isFounder) {
        return true;
      }

      // Try by codeSettingId first (new stable key format)
      const idPermission = setting._id && userPermissions[setting._id];
      // Also try just the code name (legacy format)
      const namePermission = userPermissions[setting.name];

      const hasIdPermission = idPermission?.generate === true;
      const hasNamePermission = namePermission?.generate === true;

      return hasIdPermission || hasNamePermission;
    });

    // Store the filtered settings for use in the component
    setAvailableSettings(permittedSettings);

    // Set default code type if we have settings
    if (permittedSettings.length > 0) {
      const defaultSetting = permittedSettings[0];
      const defaultType = defaultSetting.name;

      setSelectedCodeType(defaultType);
      setActiveSetting(defaultSetting);
      setCondition(defaultSetting.condition || "");
      // Initialize icon if available
      setIcon(defaultSetting.icon || "RiCodeLine");
      updateMaxPeopleOptions(defaultSetting);
    }
  }, [selectedBrand, codeSettings, selectedEvent]);

  // Fetch user-specific codes for the selected event
  useEffect(() => {
    if (selectedEvent && user && availableSettings.length > 0) {
      const fetchUserCodes = async () => {
        try {
          // Get the IDs of available code settings
          const settingIds = availableSettings.map((setting) => setting._id);

          const response = await axiosInstance.post(`/codes/event-user-codes`, {
            eventId: selectedEvent._id,
            userId: user._id,
            codeSettingIds: settingIds,
          });

          // Store the codes data
          setUserCodes(response.data.codes || {});
          setTotalCodesCount(response.data.totalCount || 0);
        } catch (error) {
          // Silent fail for user codes fetch
        }
      };

      fetchUserCodes();
    }
  }, [selectedEvent, user, availableSettings]);

  // Update active setting when code type changes
  useEffect(() => {
    if (selectedCodeType && availableSettings.length > 0) {
      const matchingSetting = availableSettings.find(
        (s) => s.name === selectedCodeType
      );

      if (matchingSetting) {
        setActiveSetting(matchingSetting);
        setCondition(matchingSetting.condition || "");
        setPax(1);
        updateMaxPeopleOptions(matchingSetting);
      }
    }
  }, [selectedCodeType, availableSettings]);

  // Refresh maxPeopleOptions when userCodes changes (after deletion or other updates)
  useEffect(() => {
    if (activeSetting) {
      updateMaxPeopleOptions(activeSetting);
    }
  }, [userCodes]);

  // Update max people options based on the active setting
  const updateMaxPeopleOptions = (setting) => {
    if (!setting) {
      setMaxPeopleOptions([1]);
      return;
    }

    // Get the maximum allowed people count from the setting
    const maxAllowed =
      setting.maxPax || (setting.name?.includes("Bottle") ? 5 : 1);

    // Get the active permission to check for limits
    const activePermission = getActivePermission();
    let adjustedMax = maxAllowed;

    // If we have a limited number of codes and they are not unlimited
    if (
      activePermission &&
      !activePermission.unlimited &&
      activePermission.limit > 0
    ) {
      // Get all codes for this setting (normalize _id to string for lookup)
      const settingIdStr = setting?._id?.toString();
      const settingCodes = (settingIdStr && userCodes[settingIdStr]) || [];

      // Calculate total people already accounted for (sum of maxPax values)
      const totalPeopleCount = settingCodes.reduce(
        (total, code) => total + (code.maxPax || 1),
        0
      );

      // For new code creation, check remaining limit
      if (totalPeopleCount < activePermission.limit) {
        // Calculate how many spots are left in total
        const remainingCount = Math.max(
          0,
          activePermission.limit - totalPeopleCount
        );

        // For new codes, we're limited by the remaining count
        adjustedMax = Math.min(maxAllowed, remainingCount || 1);
      } else if (totalPeopleCount >= activePermission.limit) {
        // If we've reached the limit, we can only have 1 person per new code
        // (but this is only for new codes - editing should still allow up to maxAllowed)
        adjustedMax = 0;
      }
    }

    // Ensure we always have at least 1 as an option if we can create any codes
    adjustedMax = Math.max(adjustedMax, 0);

    // If adjustedMax is 0, we can't create any more codes
    if (adjustedMax === 0) {
      setMaxPeopleOptions([]);
    } else {
      // Generate array of options from 1 to adjustedMax
      setMaxPeopleOptions(Array.from({ length: adjustedMax }, (_, i) => i + 1));
    }

    // Reset pax to 1 when changing options (if we can still create codes)
    if (adjustedMax > 0) {
      setPax(1);
    }

    // Trigger a UI refresh by updating the counter value
    if (refreshCounts) {
      refreshCounts();
    }
  };

  // Find the active permission for the selected code type
  const getActivePermission = () => {
    if (!selectedCodeType) return null;

    // Check if this is a co-hosted event
    const isCoHostedEvent = !!selectedEvent?.coHostBrandInfo;

    // Get permissions from co-host or regular brand role
    // Backend normalizes all permissions to plain objects (no Map conversion needed)
    let userPermissions = {};
    let permissionSource = "none";

    if (isCoHostedEvent) {
      // For co-hosted events, ONLY use effectivePermissions from the main host
      // Do NOT fall back to user's own brand permissions (they would have unlimited as founder)
      if (selectedEvent?.coHostBrandInfo?.effectivePermissions?.codes) {
        userPermissions = selectedEvent.coHostBrandInfo.effectivePermissions.codes;
        permissionSource = "coHostBrandInfo.effectivePermissions";
      } else {
        // No co-host permissions set by main host - log for debugging
        console.log("[getActivePermission] Co-hosted event but no effectivePermissions:", {
          hasCoHostBrandInfo: true,
          hasEffectivePermissions: !!selectedEvent?.coHostBrandInfo?.effectivePermissions,
          effectivePermissions: selectedEvent?.coHostBrandInfo?.effectivePermissions,
          hasCodes: !!selectedEvent?.coHostBrandInfo?.effectivePermissions?.codes,
        });
        // Return null to indicate no specific permissions (founder access still works via isFounder check)
        return null;
      }
    } else if (selectedBrand?.role?.permissions?.codes) {
      // For regular brand events, use the user's role permissions
      userPermissions = selectedBrand.role.permissions.codes;
      permissionSource = "selectedBrand.role.permissions";
    } else {
      console.log("[getActivePermission] No permissions found:", {
        isCoHostedEvent,
        hasCoHostBrandInfo: !!selectedEvent?.coHostBrandInfo,
        hasEffectivePermissions: !!selectedEvent?.coHostBrandInfo?.effectivePermissions,
        hasCodes: !!selectedEvent?.coHostBrandInfo?.effectivePermissions?.codes,
        hasBrandRole: !!selectedBrand?.role,
        hasBrandPerms: !!selectedBrand?.role?.permissions,
      });
      return null;
    }

    // Get the active setting to access its _id for permission lookup
    const settingId = activeSetting?._id;

    // Debug log the permission lookup
    console.log("[getActivePermission] Looking up:", {
      selectedCodeType,
      settingId,
      permissionSource,
      availableKeys: Object.keys(userPermissions),
      userPermissions,
    });

    // Helper function to normalize code names for fuzzy matching
    // Removes parenthetical suffixes like "(Local)", "(locally)", etc.
    const normalizeName = (name) => {
      if (!name) return "";
      return name
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*$/g, "") // Remove trailing parenthetical
        .replace(/\s+/g, " ")              // Normalize whitespace
        .trim();
    };

    // Try by codeSettingId first (new stable key), then by name (legacy fallback)
    // Convert settingId to string for consistent lookup (keys are strings)
    const settingIdStr = settingId?.toString();
    let permission =
      (settingIdStr && userPermissions[settingIdStr]) ||  // By ID as string (primary)
      userPermissions[selectedCodeType];                   // By exact name (fallback)

    // If no exact match found, try fuzzy name matching for co-hosted events
    // This handles cases where code names have been modified (e.g., "Friends Code" -> "Friends Code (Local)")
    if (!permission && isCoHostedEvent) {
      const normalizedSelectedType = normalizeName(selectedCodeType);
      const availableKeys = Object.keys(userPermissions);

      // Try to find a permission key that matches when normalized
      for (const key of availableKeys) {
        const normalizedKey = normalizeName(key);
        if (normalizedKey === normalizedSelectedType) {
          permission = userPermissions[key];
          console.log("[getActivePermission] Fuzzy match found:", {
            selectedCodeType,
            matchedKey: key,
            normalizedSelectedType,
            normalizedKey
          });
          break;
        }
      }

      // If still no match, try partial matching (one contains the other)
      if (!permission) {
        for (const key of availableKeys) {
          const normalizedKey = normalizeName(key);
          if (normalizedKey.includes(normalizedSelectedType) ||
              normalizedSelectedType.includes(normalizedKey)) {
            permission = userPermissions[key];
            console.log("[getActivePermission] Partial match found:", {
              selectedCodeType,
              matchedKey: key
            });
            break;
          }
        }
      }
    }

    if (!permission) {
      // For co-hosted events, if no permission found for a code, DENY access
      // The host must explicitly grant access to each code type
      // This prevents co-hosts from having unlimited access to new codes
      // that were created AFTER the host set co-host permissions
      if (isCoHostedEvent && activeSetting) {
        console.log("[getActivePermission] Co-host - no permission for code, denying access:", selectedCodeType);
        return {
          type: selectedCodeType,
          limit: 0,
          unlimited: false,
          hasAccess: false,  // DENY access - host must explicitly grant permission
        };
      }
      console.log("[getActivePermission] No permission found for:", { settingId, selectedCodeType });
      return null;
    }

    console.log("[getActivePermission] Found permission:", permission);

    return {
      type: selectedCodeType,
      limit: permission.limit || 0,
      unlimited: permission.unlimited === true,  // Only use explicit unlimited flag
      hasAccess: permission.generate === true,
    };
  };

  // Get max people allowed for current code type
  const getMaxPeopleAllowed = () => {
    if (!activeSetting) return 1;
    return activeSetting.maxPax || 1;
  };

  // Check if pax exceeds maxPax
  const isPaxExceedingMaximum = () => {
    return pax > getMaxPeopleAllowed();
  };

  // Determine if we should show the people selector
  const shouldShowPeopleSelector = () => {
    return activeSetting?.maxPax > 1;
  };

  // Check if user has reached code limit
  const hasReachedLimit = () => {
    const activePermission = getActivePermission();

    // If there's no permission, or it's unlimited, they haven't reached the limit
    if (!activePermission || activePermission.unlimited) {
      return false;
    }

    // Get the limit value
    const limit = activePermission.limit || 0;

    // If limit is 0 and not unlimited, user has 0 remaining codes (limit reached)
    if (limit === 0) return true;

    // Calculate how many people are accounted for by summing maxPax values
    // Normalize _id to string for consistent lookup
    const settingIdStr = activeSetting?._id?.toString();
    const totalPeopleCount =
      settingIdStr && userCodes[settingIdStr]
        ? userCodes[settingIdStr].reduce(
            (total, code) => total + (code.maxPax || 1),
            0
          )
        : 0;

    // They've reached the limit if they've used as many or more than their limit
    return totalPeopleCount >= limit;
  };

  // Handle code generation
  const handleCode = async () => {
    if (!selectedEvent) {
      showError("Please select an event first");
      return;
    }

    if (!activeSetting) {
      showError("Please select a code type");
      return;
    }

    if (!name) {
      showError("Please enter a name");
      return;
    }

    if (pax < 1) {
      showError("Please select at least 1 person");
      return;
    }

    if (isPaxExceedingMaximum()) {
      showError(`Maximum ${getMaxPeopleAllowed()} people allowed`);
      return;
    }

    showLoading("Generating code...");
    setIsLoading(true);

    try {
      // Extract user information for host and username
      const hostName = user?.firstName || user?.username || "Unknown";
      const hostUsername = user?.username || "unknown";

      // Prepare the code data with the verified username
      const codeData = {
        eventId: selectedEvent._id,
        name,
        pax,
        condition: condition || activeSetting.condition || "",
        type: activeSetting.type,
        hostName,
        hostUsername,
        tableNumber: tableNumber || "",
        codeSettingId: activeSetting._id,
        createdBy: user?._id,
        metadata: {
          codeType: selectedCodeType,
          settingId: activeSetting._id || "",
          settingName: activeSetting.name || "",
          settingColor: activeSetting.color || "#2196F3",
          settingIcon: icon || activeSetting.icon || "RiCodeLine",
          displayName: selectedCodeType,
          actualType: activeSetting.type,
          generatedFrom: "CodeGenerator",
          hostInfo: {
            id: user?._id,
            username: hostUsername,
          },
        },
        maxPax: pax,
        paxChecked: 0,
        status: "active",
        isDynamic: true,
      };

      const response = await axiosInstance.post(
        `/codes/create-dynamic`,
        codeData
      );

      // Reset form fields
      setName("");
      setPax(1);
      setCondition("");
      setTableNumber("");

      // Update local codes state with the new code
      if (response.data && response.data.code) {
        const newCode = response.data.code;
        const settingId = newCode.metadata?.settingId;

        if (settingId) {
          // Create a copy of the current userCodes
          const updatedCodes = { ...userCodes };

          // Initialize the array for this setting if it doesn't exist
          if (!updatedCodes[settingId]) {
            updatedCodes[settingId] = [];
          }

          // Add the new code to the array
          updatedCodes[settingId] = [
            {
              id: newCode._id,
              code: newCode.code,
              name: newCode.name,
              type: newCode.type,
              maxPax: newCode.maxPax,
              paxChecked: newCode.paxChecked,
              condition: newCode.condition,
              qrCode: newCode.qrCode,
              createdAt: new Date().toISOString(),
              status: "active",
              metadata: newCode.metadata,
              color: activeSetting.color || "#2196F3",
              icon:
                newCode.metadata?.settingIcon ||
                activeSetting.icon ||
                "RiCodeLine",
            },
            ...updatedCodes[settingId],
          ];

          // Update the state
          setUserCodes(updatedCodes);

          // Calculate the total people count by summing all codes' maxPax values
          const newTotalPeopleCount = Object.values(updatedCodes).reduce(
            (total, settingCodes) =>
              total +
              settingCodes.reduce(
                (settingTotal, code) => settingTotal + (code.maxPax || 1),
                0
              ),
            0
          );

          setTotalCodesCount(newTotalPeopleCount);
        }
      }

      // Refresh counts if needed
      if (refreshCounts) {
        refreshCounts();
      }

      showSuccess("Code generated successfully!");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to generate code");
    } finally {
      setIsLoading(false);
    }
  };

  // Get the counter text based on whether there's a limit or not
  const getCounterText = () => {
    const activePermission = getActivePermission();
    if (!activePermission || activePermission.unlimited) {
      return "GENERATED";
    }
    return "REMAINING";
  };

  // Get the counter value for the current code type
  const getCounterValue = () => {
    // Get the active permission for the current code type
    const activePermission = getActivePermission();
    if (!activePermission) {
      return "0";
    }

    // Normalize _id to string for consistent lookup
    const settingIdStr = activeSetting?._id?.toString();

    // For unlimited types, show the count of total people (sum of maxPax)
    if (activePermission.unlimited) {
      // Get the count of people for the active setting
      if (settingIdStr && userCodes[settingIdStr]) {
        const totalPeopleCount = userCodes[settingIdStr].reduce(
          (total, code) => total + (code.maxPax || 1),
          0
        );
        return totalPeopleCount.toString();
      }
      return "0";
    }

    // For limited types, show the remaining count
    const limit = activePermission.limit || 0;

    // Calculate total people already accounted for by summing maxPax values
    const totalPeopleCount =
      settingIdStr && userCodes[settingIdStr]
        ? userCodes[settingIdStr].reduce(
            (total, code) => total + (code.maxPax || 1),
            0
          )
        : 0;

    const remaining = Math.max(0, limit - totalPeopleCount);
    return remaining.toString();
  };

  // Calculate remaining people quota (extracted for reuse)
  const getRemainingQuota = () => {
    const activePermission = getActivePermission();

    // If there's no permission, or it's unlimited, they have unlimited quota
    if (!activePermission || activePermission.unlimited) {
      return Infinity;
    }

    // Get the limit value
    const limit = activePermission.limit || 0;

    // Calculate total people already accounted for
    // Normalize _id to string for consistent lookup
    const settingIdStr = activeSetting?._id?.toString();
    const totalPeopleCount =
      settingIdStr && userCodes[settingIdStr]
        ? userCodes[settingIdStr].reduce(
            (total, code) => total + (code.maxPax || 1),
            0
          )
        : 0;

    // Return the remaining quota
    return Math.max(0, limit - totalPeopleCount);
  };

  // Handle tab click to change code type
  const handleTabClick = (codeType) => {
    if (codeType === selectedCodeType || isLoading) return;
    setSelectedCodeType(codeType);
    // The activeSetting will be updated in the useEffect that watches selectedCodeType
  };

  // JSX for the code type tabs
  const renderCodeTypeTabs = () => {
    if (!availableSettings || availableSettings.length <= 1) return null;

    return (
      <div className="code-type-selector">
        <div className="type-tabs">
          {availableSettings.map((setting) => (
            <div
              key={setting._id}
              className={`type-tab ${
                selectedCodeType === setting.name ? "selected" : ""
              }`}
              onClick={() => handleTabClick(setting.name)}
            >
              <div className="tab-name">{setting.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Handle icon change
  const handleIconChange = async (newIcon) => {
    setIcon(newIcon);

    // Save the updated icon to the code setting
    if (activeSetting) {
      try {
        const response = await axiosInstance.put(
          `/code-settings/events/${selectedEvent._id}`,
          {
            codeSettingId: activeSetting._id,
            icon: newIcon,
          }
        );

        if (response.data && response.data.codeSettings) {
          // Update the active setting in memory
          const updatedSetting = response.data.codeSettings.find(
            (s) => s._id === activeSetting._id
          );

          if (updatedSetting) {
            setActiveSetting(updatedSetting);
          }
        }
      } catch (error) {
        // Silent fail for icon update
      }
    }
  };

  // Add a new handler for the refresh button
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      if (selectedEvent && user && availableSettings.length > 0) {
        // Get the IDs of available code settings
        const settingIds = availableSettings.map((setting) => setting._id);

        const response = await axiosInstance.post(`/codes/event-user-codes`, {
          eventId: selectedEvent._id,
          userId: user._id,
          codeSettingIds: settingIds,
        });

        // Store the codes data
        setUserCodes(response.data.codes || {});
        setTotalCodesCount(response.data.totalCount || 0);

        // Update options based on refreshed data
        if (activeSetting) {
          updateMaxPeopleOptions(activeSetting);
        }

        // Refresh counts if needed
        if (refreshCounts) {
          refreshCounts();
        }
      }
      showSuccess("Data refreshed successfully");
    } catch (error) {
      showError("Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  // Add event listener to close component when Profile is clicked in Navigation
  useEffect(() => {
    const handleCloseFromProfile = (event) => {
      // Use a small timeout to ensure smooth transitions
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 10);
    };

    window.addEventListener(
      "closeComponentFromProfile",
      handleCloseFromProfile
    );

    return () => {
      window.removeEventListener(
        "closeComponentFromProfile",
        handleCloseFromProfile
      );
    };
  }, [onClose]);

  // Add a useEffect for proper cleanup on unmount
  useEffect(() => {
    return () => {
      componentCleanup();
    };
  }, []);

  // Get icon component by name
  const getIconComponent = (iconName) => {
    return ICON_MAP[iconName] || RiCodeLine;
  };

  // Calculate progress percentage for the counter
  const getProgressPercentage = () => {
    const activePermission = getActivePermission();
    if (!activePermission || activePermission.unlimited) return 0;

    const limit = activePermission.limit || 0;
    if (limit === 0) return 0;

    // Normalize _id to string for consistent lookup
    const settingIdStr = activeSetting?._id?.toString();
    const totalPeopleCount =
      settingIdStr && userCodes[settingIdStr]
        ? userCodes[settingIdStr].reduce(
            (total, code) => total + (code.maxPax || 1),
            0
          )
        : 0;

    return Math.min(100, (totalPeopleCount / limit) * 100);
  };

  if (!activeSetting) {
    return (
      <motion.div
        className="code-generator-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="code-generator-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="panel-header">
            <h2>
              <RiCodeBoxFill /> No Codes Available
            </h2>
            <div className="header-actions">
              <button className="close-btn" onClick={onClose}>
                <RiCloseLine />
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="no-codes-message">
              <RiCodeLine className="no-codes-icon" />
              <h3>No Code Types Available</h3>
              <p>
                No code types are currently configured for this event or you don't
                have permissions to generate codes.
              </p>
              <p>Please contact the event owner to set up code types.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  const activePermission = getActivePermission();

  return (
    <motion.div
      className="code-generator-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="code-generator-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="panel-header">
          <h2>
            <RiCodeBoxFill />
            <span className="event-title">
              {selectedEvent?.title || "Generate Code"}
            </span>
          </h2>
          <div className="header-actions">
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RiRefreshLine className={isLoading ? "spinning" : ""} />
            </button>
            <button className="close-btn" onClick={onClose}>
              <RiCloseLine />
            </button>
          </div>
        </div>

        {/* Panel Body - Scrollable */}
        <div className="panel-body">
          {/* Code Type Chips - Always show when there are settings */}
          {availableSettings && availableSettings.length >= 1 && (
            <div className={`code-type-chips ${availableSettings.length === 1 ? 'single-type' : ''}`}>
              {availableSettings.map((setting) => {
                const IconComp = getIconComponent(setting.icon);
                return (
                  <button
                    key={setting._id}
                    className={`type-chip ${
                      selectedCodeType === setting.name ? "selected" : ""
                    }`}
                    onClick={() => handleTabClick(setting.name)}
                    disabled={isLoading || availableSettings.length === 1}
                  >
                    <IconComp />
                    {setting.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Counter Card */}
          <div className="counter-card">
            <div className="counter-info">
              <span className="counter-label">{getCounterText()}</span>
              <span className="counter-value">{getCounterValue()}</span>
            </div>
            {activePermission && !activePermission.unlimited && (
              <div className="counter-progress">
                <div
                  className="progress-bar"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            )}
          </div>

          {/* Form Card */}
          <div className="form-card">
            <h3>Generate New Code</h3>

            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter guest name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={hasReachedLimit() || isLoading}
              />
            </div>

            {activeSetting &&
              shouldShowPeopleSelector() &&
              activeSetting.maxPax > 1 && (
                <div className="form-row">
                  <div className="form-field">
                    <label>People</label>
                    <select
                      value={pax}
                      onChange={(e) => setPax(parseInt(e.target.value))}
                      disabled={hasReachedLimit() || isLoading}
                    >
                      {maxPeopleOptions.map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "Person" : "People"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            {activeSetting && activeSetting.customizableCondition && (
              <div className="form-field">
                <label>Condition</label>
                <input
                  type="text"
                  placeholder="e.g., Free entry before 12am"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            {activeSetting && activeSetting.type === "table" && (
              <div className="form-field">
                <label>Table Number</label>
                <input
                  type="text"
                  placeholder="e.g., T1, VIP-3"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              className={`generate-btn ${hasReachedLimit() ? "limit-reached" : ""}`}
              disabled={
                !name ||
                pax < 1 ||
                !activeSetting ||
                isLoading ||
                hasReachedLimit()
              }
              onClick={handleCode}
            >
              {isLoading ? (
                "Generating..."
              ) : hasReachedLimit() ? (
                "Limit Reached"
              ) : (
                <>
                  <RiAddLine /> Generate Code
                </>
              )}
            </button>
          </div>

          {/* Generated Codes Section */}
          <div className="generated-codes-section">
            <div className="section-header">
              <h3>Generated Codes</h3>
              <span className="codes-count">
                {(() => {
                  const settingIdStr = activeSetting?._id?.toString();
                  return settingIdStr && userCodes[settingIdStr]
                    ? userCodes[settingIdStr].length
                    : 0;
                })()}
              </span>
            </div>

            <CodeManagement
              user={user}
              type={selectedCodeType}
              codes={
                (() => {
                  const settingIdStr = activeSetting?._id?.toString();
                  return settingIdStr && userCodes[settingIdStr]
                    ? userCodes[settingIdStr].map((code) => ({
                      ...code,
                      color: code.color || activeSetting.color || "#2196F3",
                      icon: code.icon || activeSetting.icon || "RiCodeLine",
                      metadata: {
                        ...code.metadata,
                        settingIcon:
                          code.metadata?.settingIcon ||
                          activeSetting.icon ||
                          "RiCodeLine",
                      },
                    }))
                  : [];
                })()
              }
              setCodes={(updatedCodes) => {
                const settingIdStr = activeSetting?._id?.toString();
                if (settingIdStr) {
                  // Create a copy of userCodes
                  const updatedUserCodes = { ...userCodes };
                  // Update the specific setting's codes (use string key)
                  updatedUserCodes[settingIdStr] = updatedCodes;
                  // Update state
                  setUserCodes(updatedUserCodes);
                  // Update total count based on maxPax values
                  const newTotalPeopleCount = Object.values(
                    updatedUserCodes
                  ).reduce(
                    (total, settingCodes) =>
                      total +
                      settingCodes.reduce(
                        (settingTotal, code) => settingTotal + (code.maxPax || 1),
                        0
                      ),
                    0
                  );
                  setTotalCodesCount(newTotalPeopleCount);
                  // Force a refresh of the maxPeopleOptions
                  updateMaxPeopleOptions(activeSetting);
                }
              }}
              selectedEvent={selectedEvent}
              isLoading={isLoading}
              activeSetting={activeSetting}
              maxPeopleOptions={maxPeopleOptions}
              maxPeopleAllowed={getMaxPeopleAllowed()}
              remainingQuota={getRemainingQuota()}
              hasLimitReached={hasReachedLimit()}
              refreshCodes={() => {
                if (activeSetting) {
                  updateMaxPeopleOptions(activeSetting);
                }
              }}
              refreshCounts={refreshCounts}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CodeGenerator;
