import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./CodeGenerator.scss";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import CodeManagement from "../CodeManagement/CodeManagement";
import { BsPeopleFill } from "react-icons/bs";
import { RiCodeBoxFill, RiCloseLine, RiRefreshLine } from "react-icons/ri";
import { componentCleanup } from "../../utils/layoutHelpers";

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
    // Initialize component with settings and user permissions

    // Get user role permissions from selectedBrand or co-host permissions
    let userPermissions = {};
    
    // Check if this is a co-hosted event with effective permissions
    if (selectedEvent?.coHostBrandInfo?.effectivePermissions?.codes) {
      userPermissions = selectedEvent.coHostBrandInfo.effectivePermissions.codes;
      
      // Handle Map to object conversion if needed
      if (userPermissions instanceof Map) {
        userPermissions = Object.fromEntries(userPermissions);
      }
    } else if (selectedBrand?.role?.permissions?.codes) {
      userPermissions = selectedBrand.role.permissions.codes;
      
      // Handle Map to object conversion if needed
      if (userPermissions instanceof Map) {
        userPermissions = Object.fromEntries(userPermissions);
      }
    }

    // Filter for custom codes (isEditable: true) that are also enabled (isEnabled: true)
    const customCodeSettings = codeSettings.filter(
      (setting) => setting.isEditable === true && setting.isEnabled === true
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

    // Filter settings based on user permissions
    const permittedSettings = uniqueCodeSettings.filter((setting) => {
      const permissionKey = setting.name;
      const hasPermission = userPermissions[permissionKey]?.generate === true;
      return hasPermission;
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
      // Get all codes for this setting
      const settingCodes = userCodes[setting._id] || [];

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

    // Get permissions from co-host or regular brand role
    let userPermissions = {};
    
    if (selectedEvent?.coHostBrandInfo?.effectivePermissions?.codes) {
      userPermissions = selectedEvent.coHostBrandInfo.effectivePermissions.codes;
      // Handle Map to object conversion if needed
      if (userPermissions instanceof Map) {
        userPermissions = Object.fromEntries(userPermissions);
      }
    } else if (selectedBrand?.role?.permissions?.codes) {
      userPermissions = selectedBrand.role.permissions.codes;
      // Handle Map to object conversion if needed
      if (userPermissions instanceof Map) {
        userPermissions = Object.fromEntries(userPermissions);
      }
    } else {
      return null;
    }
    const permission = userPermissions[selectedCodeType];

    if (!permission) return null;

    return {
      type: selectedCodeType,
      limit: permission.limit || 0,
      unlimited: permission.unlimited || permission.limit === 0,
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

    // If limit is 0, it's unlimited
    if (limit === 0) return false;

    // Calculate how many people are accounted for by summing maxPax values
    const totalPeopleCount =
      activeSetting && userCodes[activeSetting._id]
        ? userCodes[activeSetting._id].reduce(
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

    // For unlimited types, show the count of total people (sum of maxPax)
    if (activePermission.unlimited) {
      // Get the count of people for the active setting
      if (activeSetting && userCodes[activeSetting._id]) {
        const totalPeopleCount = userCodes[activeSetting._id].reduce(
          (total, code) => total + (code.maxPax || 1),
          0
        );
        return totalPeopleCount.toString();
      }
      return "0";
    }

    // For limited types, show the remaining count
    const limit = activePermission.limit || 0;
    if (limit === 0) return "∞";

    // Calculate total people already accounted for by summing maxPax values
    const totalPeopleCount =
      activeSetting && userCodes[activeSetting._id]
        ? userCodes[activeSetting._id].reduce(
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

    // If limit is 0, it's unlimited
    if (limit === 0) return Infinity;

    // Calculate total people already accounted for
    const totalPeopleCount =
      activeSetting && userCodes[activeSetting._id]
        ? userCodes[activeSetting._id].reduce(
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

  if (!activeSetting) {
    return (
      <div className="code">
        <div className="code-wrapper">
          <Navigation onBack={onClose} />
          <h1 className="code-title">No Code Types Available</h1>
          <p>
            No code types are currently configured for this event or you don't
            have permissions to generate codes.
            <br />
            Please contact the event owner to set up code types.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="code-generator">
      <Navigation onBack={onClose} title={`${type || "Event"} Codes`} />
      <div className="code-generator-container">
        {/* Add stylized header similar to Analytics */}
        <div className="code-header">
          <h2>
            <RiCodeBoxFill /> Code Generator
            {selectedEvent && (
              <span className="event-name"> - {selectedEvent.title}</span>
            )}
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

        {/* Event logo container */}
        <div className="brand-logo-container">
          {selectedEvent && (
            <>
              {selectedEvent.brand &&
              selectedEvent.brand.logo &&
              (selectedEvent.brand.logo.full ||
                selectedEvent.brand.logo.medium ||
                selectedEvent.brand.logo.thumbnail) ? (
                <img
                  src={
                    selectedEvent.brand.logo.full ||
                    selectedEvent.brand.logo.medium ||
                    selectedEvent.brand.logo.thumbnail
                  }
                  alt={selectedEvent.name || selectedEvent.title}
                  className="code-logo"
                  style={
                    selectedEvent.primaryColor
                      ? { borderColor: selectedEvent.primaryColor }
                      : {}
                  }
                />
              ) : selectedBrand && selectedBrand.logo ? (
                <img
                  src={
                    selectedBrand.logo.full ||
                    selectedBrand.logo.medium ||
                    selectedBrand.logo.thumbnail ||
                    selectedBrand.logo.url
                  }
                  alt={selectedBrand.name}
                  className="code-logo"
                  style={
                    selectedEvent.primaryColor
                      ? { borderColor: selectedEvent.primaryColor }
                      : {}
                  }
                />
              ) : (
                <div
                  className="code-logo-placeholder"
                  style={
                    selectedEvent.primaryColor
                      ? { backgroundColor: selectedEvent.primaryColor }
                      : {}
                  }
                >
                  {selectedEvent.name ? selectedEvent.name.charAt(0) : "G"}
                </div>
              )}
            </>
          )}
        </div>

        <div className="code-generator-header">
          <div className="counter-container">
            <div className="counter-label">{getCounterText()}</div>
            <div className="counter-value">{getCounterValue()}</div>
          </div>
        </div>

        {/* Code Generator View */}
        <div className="code-generator-section">
          {renderCodeTypeTabs()}

          <div className="code-form">
            <div className="input-container">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={hasReachedLimit() || isLoading}
              />
            </div>

            {activeSetting &&
              shouldShowPeopleSelector() &&
              activeSetting.maxPax > 1 && (
                <div className="input-container">
                  <select
                    className="people-select"
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
              )}

            {activeSetting && activeSetting.customizableCondition && (
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Condition (optional)"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                />
              </div>
            )}

            {activeSetting && activeSetting.type === "table" && (
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Table Number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            )}

            <button
              className="code-btn"
              disabled={
                !name ||
                pax < 1 ||
                !activeSetting ||
                isLoading ||
                hasReachedLimit()
              }
              onClick={handleCode}
            >
              {isLoading
                ? "Loading..."
                : hasReachedLimit()
                ? "Limit Reached"
                : "Generate Code"}
            </button>
          </div>
        </div>

        {/* Code Management Section */}
        <div className="code-management-container">
          <CodeManagement
            user={user}
            type={selectedCodeType}
            codes={
              activeSetting && userCodes[activeSetting._id]
                ? userCodes[activeSetting._id].map((code) => ({
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
                : []
            }
            setCodes={(updatedCodes) => {
              if (activeSetting) {
                // Create a copy of userCodes
                const updatedUserCodes = { ...userCodes };
                // Update the specific setting's codes
                updatedUserCodes[activeSetting._id] = updatedCodes;
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
      <Footer />
    </div>
  );
}

export default CodeGenerator;
