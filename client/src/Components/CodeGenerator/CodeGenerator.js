import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./CodeGenerator.scss";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import CodeManagement from "../CodeManagement/CodeManagement";
import { BsPeopleFill } from "react-icons/bs";

function CodeGenerator({
  user,
  onClose,
  type,
  refreshCounts,
  codeSettings = [],
  codePermissions = [],
  accessSummary = {},
  selectedBrand,
  selectedEvent,
  onEventDataUpdate,
}) {
  const { showSuccess, showError, showLoading } = useToast();
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [condition, setCondition] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [activeSetting, setActiveSetting] = useState(null);
  const [availableSettings, setAvailableSettings] = useState([]);
  const [selectedCodeType, setSelectedCodeType] = useState(null);
  const [codesGenerated, setCodesGenerated] = useState(0);
  const [maxPeopleOptions, setMaxPeopleOptions] = useState([1]);
  const [isFetchingCodes, setIsFetchingCodes] = useState(false);
  const [userCodeCounts, setUserCodeCounts] = useState({
    byName: {},
    bySettingId: {},
    codesBySettingId: {},
  });

  // Store the current codes in state to ensure consistency
  const [currentTypeCodes, setCurrentTypeCodes] = useState([]);

  // Add state to track the previous code type data for smooth transitions
  const [previousTypeData, setPreviousTypeData] = useState({
    codeType: null,
    codes: [],
    count: 0,
  });

  // Reference to track previous selectedCodeType for logging
  const previousCodeTypeRef = useRef(null);

  // Reference to track last fetch times to prevent duplicate requests
  const lastFetchRef = useRef({
    counts: {},
    userCounts: {},
  });

  // Reference to track if we've already logged the code summary
  const hasLoggedCodeSummaryRef = useRef(false);

  // Initialize component with settings and permissions
  useEffect(() => {
    // Log initialization info
    console.log("🔄 CodeGenerator Initialization:", {
      type,
      codeSettings: codeSettings.length,
      codePermissions: codePermissions.length,
    });

    if (!codeSettings.length || !codePermissions.length) {
      return; // Wait until we have both settings and permissions
    }

    // Set available settings based on permissions
    const availableCodeTypes = codePermissions
      .filter((permission) => permission.hasAccess)
      .map((permission) => permission.type);

    // Find settings that match the available types
    const filteredSettings = codeSettings.filter((setting) =>
      availableCodeTypes.includes(setting.type)
    );

    console.log("✅ Available code types:", availableCodeTypes);
    console.log(
      "✅ Filtered settings:",
      filteredSettings.map((s) => s.name || s.type)
    );

    setAvailableSettings(filteredSettings);

    // Always use the first available setting regardless of type prop
    if (filteredSettings.length > 0) {
      const defaultSetting = filteredSettings[0];
      const defaultType = defaultSetting.name || defaultSetting.type;

      console.log(`🔄 Setting default code type to ${defaultType}`);

      // Set all the necessary state for the default code type
      setSelectedCodeType(defaultType);
      setActiveSetting(defaultSetting);
      setCondition(defaultSetting.condition || "");
      updateMaxPeopleOptions(defaultSetting);

      // Store as previous type data to avoid flashes
      setPreviousTypeData({
        codeType: defaultType,
        codes: [],
        count: 0,
      });
    }
  }, [codeSettings, codePermissions]);

  // When the component mounts, ensure we fetch data for the selected type
  useEffect(() => {
    // This useEffect will run once when the component mounts and selectedEvent is available
    if (selectedEvent && selectedCodeType && !hasLoggedCodeSummaryRef.current) {
      console.log(`🔄 Initial fetch for ${selectedCodeType}`);
      fetchUserSpecificCodeCounts();
    }
  }, [selectedEvent, selectedCodeType]); // Only depend on these two props

  // Separate useEffect to handle tab changes
  useEffect(() => {
    if (
      previousTypeData.codeType &&
      selectedCodeType !== previousTypeData.codeType &&
      selectedEvent
    ) {
      console.log(
        `🔄 Tab changed from ${previousTypeData.codeType} to ${selectedCodeType}`
      );
      fetchUserSpecificCodeCounts();
    }
  }, [selectedCodeType]);

  // When the selected code type changes, handle transitions smoothly
  useEffect(() => {
    if (
      selectedCodeType &&
      previousTypeData.codeType &&
      selectedCodeType !== previousTypeData.codeType
    ) {
      // When switching code types, keep previous data until new data is fetched
      console.log(
        `🔄 Switching from ${previousTypeData.codeType} to ${selectedCodeType}`
      );
    }
  }, [selectedCodeType, previousTypeData.codeType]);

  // Find the active permission matching the selected code type
  const getActivePermission = () => {
    if (!selectedCodeType || !codePermissions) return null;

    // Try to find a permission that matches by type or name
    const matchingPermission = codePermissions.find(
      (perm) => perm.type === selectedCodeType || perm.name === selectedCodeType
    );

    // Store the current code type for reference
    previousCodeTypeRef.current = selectedCodeType;

    // If no matching permission was found, log it for debugging
    if (!matchingPermission && selectedCodeType) {
      console.log(`⚠️ No matching permission found for ${selectedCodeType}`);
      console.log("Available permissions:", codePermissions);
    }

    return matchingPermission;
  };

  // Fetch code counts when the selected event or code type changes
  useEffect(() => {
    if (selectedEvent && selectedCodeType) {
      // Before fetching new data, store the current data as previous
      if (currentTypeCodes.length > 0) {
        setPreviousTypeData({
          codeType: selectedCodeType,
          codes: currentTypeCodes,
          count: codesGenerated,
        });
      }

      fetchUserSpecificCodeCounts();
    }
  }, [selectedEvent?._id, selectedCodeType]);

  // Update max people options based on the active setting
  const updateMaxPeopleOptions = (setting) => {
    if (!setting) {
      setMaxPeopleOptions([1]);
      return;
    }

    // Get the maximum allowed people count
    const maxAllowed =
      setting.maxPax || (setting.name?.includes("Bottle") ? 5 : 1);

    // Generate array of options from 1 to maxAllowed
    setMaxPeopleOptions(Array.from({ length: maxAllowed }, (_, i) => i + 1));

    // Reset pax to 1 when changing options
    setPax(1);
  };

  // Fetch event-specific code settings if not provided
  useEffect(() => {
    const fetchEventCodeSettings = async () => {
      if (!selectedEvent) return;

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/code-settings/events/${selectedEvent._id}`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.data?.codeSettings) {
          const settings = response.data.codeSettings.filter(
            (s) => s.isEnabled
          );
          setAvailableSettings(settings);

          // Set active setting based on type prop or first available setting
          const matchingSetting =
            settings.find((s) => s.type === type || s.codeType === type) ||
            settings[0];

          if (matchingSetting) {
            setActiveSetting(matchingSetting);
            setCondition(matchingSetting.condition || "");
            setPax(1);
            updateMaxPeopleOptions(matchingSetting);
          }

          // Update the selectedEvent with additional data if available
          if (
            response.data.eventName ||
            response.data.eventLogo ||
            response.data.primaryColor
          ) {
            const updatedEvent = {
              ...selectedEvent,
              name:
                response.data.eventName ||
                selectedEvent.name ||
                selectedEvent.title,
              logo:
                response.data.eventLogo ||
                selectedEvent.logo ||
                selectedEvent.flyer,
              primaryColor: response.data.primaryColor,
            };

            if (onEventDataUpdate) {
              onEventDataUpdate(updatedEvent);
            }
          }
        }
      } catch (error) {
        showError("Failed to load code settings");
      }
    };

    if (codeSettings.length === 0) {
      fetchEventCodeSettings();
    } else {
      const enabledSettings = codeSettings.filter((s) => s.isEnabled);
      setAvailableSettings(enabledSettings);

      // Find settings that match the selected code type or use the default type
      const selectedTypeOrDefault = selectedCodeType || type;

      // Improved matching logic to handle both type and codeType
      const matchingSetting =
        enabledSettings.find(
          (s) =>
            s.type === selectedTypeOrDefault ||
            s.codeType === selectedTypeOrDefault ||
            s.name === selectedTypeOrDefault
        ) || enabledSettings[0];

      if (matchingSetting) {
        setActiveSetting(matchingSetting);
        setCondition(matchingSetting.condition || "");
        updateMaxPeopleOptions(matchingSetting);
      }
    }
  }, [selectedEvent, type, codeSettings, selectedCodeType]);

  // Update active setting when code type changes
  useEffect(() => {
    if (selectedCodeType && availableSettings.length > 0) {
      const matchingSetting = availableSettings.find(
        (s) =>
          s.type === selectedCodeType ||
          s.codeType === selectedCodeType ||
          s.name?.includes(selectedCodeType)
      );

      if (matchingSetting) {
        console.log(
          `✅ Found matching setting for ${selectedCodeType}:`,
          matchingSetting
        );
        setActiveSetting(matchingSetting);

        // Set condition based on code type
        setCondition(
          selectedCodeType === "Bottle Code"
            ? "1 Free Bottle"
            : matchingSetting.condition || ""
        );

        setPax(1);
        updateMaxPeopleOptions(matchingSetting);

        // Ensure we fetch data for this setting
        if (selectedEvent) {
          // Delay fetch slightly to ensure state updates have completed
          setTimeout(() => {
            console.log(`🔄 Triggering fetch for ${selectedCodeType}`);
            fetchUserSpecificCodeCounts(matchingSetting._id);
          }, 100);
        }
      } else {
        console.log(
          `⚠️ No matching setting found for ${selectedCodeType} among:`,
          availableSettings.map((s) => ({ name: s.name, type: s.type }))
        );
      }
    }
  }, [selectedCodeType, availableSettings, selectedEvent]);

  // Reset the log flag when the selected code type changes
  useEffect(() => {
    if (selectedCodeType !== previousCodeTypeRef.current) {
      previousCodeTypeRef.current = selectedCodeType;
      hasLoggedCodeSummaryRef.current = false;
    }
  }, [selectedCodeType]);

  // Get the code objects for a specific setting
  const getCodesForSetting = (settingId) => {
    if (!settingId || !userCodeCounts.codesBySettingId) {
      return [];
    }
    return userCodeCounts.codesBySettingId[settingId] || [];
  };

  // Get the code objects for the current selected code type
  const getCodesForSelectedType = () => {
    const matchingSetting = codeSettings.find(
      (setting) =>
        setting.name === selectedCodeType || setting.type === selectedCodeType
    );

    if (!matchingSetting) {
      return [];
    }

    return getCodesForSetting(matchingSetting._id);
  };

  // Update codes when selected code type changes
  useEffect(() => {
    if (selectedCodeType) {
      // Get user-specific codes for the selected type
      const userSpecificCodes = getCodesForSelectedType();
      setCodesGenerated(userSpecificCodes.length);
      // Update the current codes state to ensure consistency
      setCurrentTypeCodes(userSpecificCodes);

      // Fetch fresh data when code type changes
      fetchUserSpecificCodeCounts();
    }
  }, [selectedCodeType, userCodeCounts.codesBySettingId]);

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

    try {
      // Extract user information for host and username
      const hostName = user?.firstName || user?.username || "Unknown";
      const hostUsername = user?.username || "unknown";

      // Prepare the code data
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
          displayName: selectedCodeType,
          actualType: activeSetting.type,
          generatedFrom: "CodeGenerator",
        },
        maxPax: pax,
        paxChecked: 0,
        status: "active",
        isDynamic: true,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/codes/create-dynamic`,
        codeData,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showSuccess("Code generated successfully!");

      // Reset form fields
      setName("");
      setPax(1);
      setCondition("");
      setTableNumber("");

      // Get the new code from the response
      const newCode = response.data.code || response.data;

      // Log the newly created code
      console.log("✅ NEW CODE CREATED:", {
        id: newCode._id,
        name: newCode.name,
        code: newCode.code,
        pax: newCode.pax || newCode.maxPax,
      });

      // Add the new code to the codes array
      if (newCode) {
        setCodesGenerated(codesGenerated + 1);

        // Update user code counts with the new code
        const matchingSetting = codeSettings.find(
          (setting) =>
            setting.name === selectedCodeType ||
            setting.type === selectedCodeType
        );

        if (matchingSetting) {
          const updatedCodesBySettingId = {
            ...userCodeCounts.codesBySettingId,
            [matchingSetting._id]: [
              ...(userCodeCounts.codesBySettingId[matchingSetting._id] || []),
              newCode,
            ],
          };

          setUserCodeCounts((prev) => ({
            ...prev,
            codesBySettingId: updatedCodesBySettingId,
          }));
        }
      }

      // Refresh counts if needed
      if (refreshCounts) {
        refreshCounts();
      }

      // Refresh code counts
      fetchUserSpecificCodeCounts();

      // Reset the log flag so we can see the updated logs
      hasLoggedCodeSummaryRef.current = false;
    } catch (error) {
      showError(error.response?.data?.message || "Failed to generate code");
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
    const activePermission = getActivePermission();
    if (!activePermission) {
      return "0";
    }

    // Find the matching setting for the selected code type
    const matchingSetting = codeSettings.find(
      (setting) =>
        setting.name === selectedCodeType || setting.type === selectedCodeType
    );

    // Get the user's generated count for this code type
    let userGeneratedCount = 0;

    // Try to get the count by setting ID if we have a matching setting
    if (
      matchingSetting &&
      userCodeCounts.bySettingId &&
      userCodeCounts.bySettingId[matchingSetting._id] !== undefined
    ) {
      userGeneratedCount = userCodeCounts.bySettingId[matchingSetting._id];
    }
    // Try to get the count by name as a fallback
    else if (
      userCodeCounts.byName &&
      userCodeCounts.byName[selectedCodeType] !== undefined
    ) {
      userGeneratedCount = userCodeCounts.byName[selectedCodeType];
    }

    // For unlimited types, show the count of generated codes
    if (activePermission.unlimited) {
      return userGeneratedCount.toString(); // Show the count of generated codes
    }

    // For limited types, calculate remaining based on the user's limit and their usage
    const remaining = Math.max(0, activePermission.limit - userGeneratedCount);
    return remaining.toString();
  };

  // Log the codes for the selected type whenever it changes
  useEffect(() => {
    const codes = getCodesForSelectedType();
    if (codes.length > 0 && !hasLoggedCodeSummaryRef.current) {
      console.log(`📊 Current codes for ${selectedCodeType}:`, codes);

      // Display codes in a more structured way
      console.table(
        codes.map((code) => ({
          id: code.id,
          name: code.name,
          code: code.code,
          pax: code.pax,
          createdAt: new Date(code.createdAt).toLocaleString(),
        }))
      );
    }
  }, [selectedCodeType, userCodeCounts.codesBySettingId]);

  // Log all codes when the component mounts
  useEffect(() => {
    if (
      Object.keys(userCodeCounts.codesBySettingId).length > 0 &&
      !hasLoggedCodeSummaryRef.current
    ) {
      // Set the ref to true to prevent repeated logs
      hasLoggedCodeSummaryRef.current = true;

      console.log(
        "🔍 ALL CODE OBJECTS BY SETTING ID:",
        userCodeCounts.codesBySettingId
      );

      // Display a summary of codes by setting
      console.log("📊 CODES SUMMARY:");
      Object.entries(userCodeCounts.codesBySettingId).forEach(
        ([settingId, codes]) => {
          const setting = codeSettings.find((s) => s._id === settingId);
          console.log(
            `Setting: ${setting?.name || settingId} (${codes.length} codes)`
          );

          if (codes.length > 0) {
            console.table(
              codes.map((code) => ({
                id: code.id?.substring(0, 10) + "...",
                name: code.name,
                code: code.code,
                pax: code.pax,
                createdAt: new Date(code.createdAt).toLocaleString(),
              }))
            );
          }
        }
      );
    }
  }, [userCodeCounts.codesBySettingId, codeSettings]);

  // Modify the fetchUserSpecificCodeCounts function
  const fetchUserSpecificCodeCounts = async (forcedSettingId) => {
    // Check if we have a valid user and event
    const hasUser = user && (typeof user === "string" || user?.id || user?._id);
    if (!selectedEvent || !hasUser) {
      console.log("⚠️ Missing user or event for fetch");
      return;
    }

    // Extract the key IDs we need
    const userId = typeof user === "string" ? user : user?.id || user?._id;
    const eventId = selectedEvent._id || selectedEvent.id;

    // Get the active setting ID - either use the forced ID or find the matching setting
    let activeSettingId = forcedSettingId;

    if (!activeSettingId) {
      const matchingSetting = codeSettings.find(
        (setting) =>
          setting.name === selectedCodeType || setting.type === selectedCodeType
      );

      if (matchingSetting) {
        activeSettingId = matchingSetting._id;
      } else if (activeSetting) {
        activeSettingId = activeSetting._id;
      }
    }

    if (!activeSettingId) {
      console.log(`⚠️ No active setting ID found for ${selectedCodeType}`);
      return;
    }

    // Create a key to identify this specific fetch
    const fetchKey = `user_${userId}_event_${eventId}_setting_${activeSettingId}`;

    // Check if we've fetched this data recently (within the last 1 second)
    const now = Date.now();
    if (
      lastFetchRef.current.userCounts &&
      lastFetchRef.current.userCounts[fetchKey] &&
      now - lastFetchRef.current.userCounts[fetchKey] < 1000 &&
      !forcedSettingId // Skip the cache check if a specific setting ID is forced
    ) {
      console.log(`⏭️ Skipping recent fetch for setting: ${activeSettingId}`);
      return;
    }

    // Update the last fetch time for this key
    if (!lastFetchRef.current.userCounts) {
      lastFetchRef.current.userCounts = {};
    }
    lastFetchRef.current.userCounts[fetchKey] = now;

    console.log(
      `🔍 Fetching codes for setting: ${activeSettingId} (${
        selectedCodeType || "unknown"
      })`
    );
    setIsFetchingCodes(true);

    try {
      // Prepare the request URL and parameters
      const requestUrl = `${process.env.REACT_APP_API_BASE_URL}/codes/user-counts/${eventId}/${userId}`;
      const requestParams = {
        settingId: activeSettingId,
      };

      console.log(
        `🔄 Making API request to ${requestUrl} with params:`,
        requestParams
      );

      const response = await axios.get(requestUrl, {
        params: requestParams,
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data) {
        // Extract the settings and summary from the response
        const { settings = {}, summary = {} } = response.data;

        console.log(
          `✅ Received data for setting ${activeSettingId}:`,
          Object.keys(settings).map((id) => ({
            id,
            name: settings[id]?.setting?.name,
            count: settings[id]?.codes?.length,
          }))
        );

        // Convert the response data to a format that maps code setting names to counts
        const countsByName = {};
        const countsBySettingId = {};
        const codesBySettingId = {};

        // Process each code setting
        Object.entries(settings).forEach(([settingId, data]) => {
          const { setting, count, codes = [] } = data;

          // Store counts by setting ID
          countsBySettingId[settingId] = count;

          // Store codes by setting ID
          codesBySettingId[settingId] = codes;

          // Store counts by setting name
          if (setting && setting.name) {
            countsByName[setting.name] = count;
          }
        });

        // Update the state with the new counts
        setUserCodeCounts({
          byName: countsByName,
          bySettingId: countsBySettingId,
          codesBySettingId: codesBySettingId,
        });

        // Double check that we're setting the correct current type codes
        if (activeSettingId && codesBySettingId[activeSettingId]) {
          console.log(
            `✅ Setting ${codesBySettingId[activeSettingId].length} codes for ${activeSettingId}`
          );
          setCurrentTypeCodes(codesBySettingId[activeSettingId]);
          setCodesGenerated(codesBySettingId[activeSettingId].length);

          // Also update the previous type data
          setPreviousTypeData({
            codeType: selectedCodeType,
            codes: codesBySettingId[activeSettingId],
            count: codesBySettingId[activeSettingId].length,
          });
        } else {
          console.log(
            `⚠️ No codes found for setting ${activeSettingId} in:`,
            Object.keys(codesBySettingId)
          );
          // If no codes found, set to empty array
          setCurrentTypeCodes([]);
          setCodesGenerated(0);
        }

        // Mark that we've logged the summary
        hasLoggedCodeSummaryRef.current = true;
      }
    } catch (error) {
      console.error("Error fetching user-specific code counts:", error.message);

      // Log additional details about the error
      if (error.response) {
        console.log("Error response:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      // Fallback mechanism for 404 errors
      if (error.response && error.response.status === 404) {
        console.log(`⚠️ 404 error for setting ${activeSettingId}`);

        // Create fallback empty data structure for the active setting
        setUserCodeCounts((prev) => ({
          ...prev,
          byName: {
            ...prev.byName,
            [selectedCodeType]: 0,
          },
          bySettingId: {
            ...prev.bySettingId,
            [activeSettingId]: 0,
          },
          codesBySettingId: {
            ...prev.codesBySettingId,
            [activeSettingId]: [],
          },
        }));

        // Update currentTypeCodes for the fallback case
        setCurrentTypeCodes([]);
        setCodesGenerated(0);

        // Reset previous data for this code type
        setPreviousTypeData({
          codeType: selectedCodeType,
          codes: [],
          count: 0,
        });
      }
    } finally {
      setIsFetchingCodes(false);
    }
  };

  // Improve the handleTabClick function to be more robust
  const handleTabClick = (codeType) => {
    if (codeType === selectedCodeType || isFetchingCodes) return;

    console.log(`🔄 Tab clicked: ${codeType}`);

    // Store current data before switching
    setPreviousTypeData({
      codeType: selectedCodeType,
      codes: currentTypeCodes,
      count: codesGenerated,
    });

    // Set the new code type
    setSelectedCodeType(codeType);

    // The useEffect will handle the rest of the setup and data fetching
  };

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
          {codePermissions && codePermissions.length > 1 && (
            <div className="code-type-selector">
              <div className="type-tabs">
                {codePermissions.map((permission) => (
                  <div
                    key={permission.type}
                    className={`type-tab ${
                      selectedCodeType === permission.type ? "selected" : ""
                    }`}
                    onClick={() => handleTabClick(permission.type)}
                  >
                    <div className="tab-name">{permission.type}</div>
                    <div className="tab-limit">
                      {permission.unlimited ? "∞" : permission.limit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="code-form">
            <div className="input-container">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                isFetchingCodes ||
                !selectedCodeType
              }
              onClick={handleCode}
            >
              {isFetchingCodes ? "Loading..." : "Generate Code"}
            </button>
          </div>
        </div>

        {/* Replace user-codes-container with CodeManagement */}
        <div className="code-management-container">
          <CodeManagement
            user={user}
            type={selectedCodeType}
            setCodes={(newCodes) => {
              // Update user code counts with the new codes
              const matchingSetting = codeSettings.find(
                (setting) =>
                  setting.name === selectedCodeType ||
                  setting.type === selectedCodeType
              );

              if (matchingSetting) {
                const updatedCodesBySettingId = {
                  ...userCodeCounts.codesBySettingId,
                  [matchingSetting._id]: newCodes,
                };

                setUserCodeCounts((prev) => ({
                  ...prev,
                  codesBySettingId: updatedCodesBySettingId,
                }));

                setCodesGenerated(newCodes.length);
                // Also update the current codes state
                setCurrentTypeCodes(newCodes);
              }
            }}
            codes={currentTypeCodes}
            refreshCodes={fetchUserSpecificCodeCounts}
            refreshCounts={refreshCounts}
            counts={codesGenerated}
            selectedEvent={selectedEvent}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CodeGenerator;
