import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./CodeGenerator.scss";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import CodeManagement from "../CodeManagement/CodeManagement";

function CodeGenerator({
  user,
  onClose,
  type,
  refreshCounts,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  dataInterval,
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
  const [codes, setCodes] = useState([]);
  const [totalPaxUsed, setTotalPaxUsed] = useState(0);
  const [selectedCodeType, setSelectedCodeType] = useState(null);
  const [codesGenerated, setCodesGenerated] = useState(0);
  const [maxPeopleOptions, setMaxPeopleOptions] = useState([1]);

  // Add a ref to stabilize counter values
  const counterValueRef = useRef({});

  // Add a state to track if we're currently fetching
  const [isFetchingCodes, setIsFetchingCodes] = useState(false);

  // Add a state to track if codes have been loaded
  const [codesLoaded, setCodesLoaded] = useState(false);

  // Add a state to track counts for each code type
  const [codeCountsByType, setCodeCountsByType] = useState({});

  // Debug - log the initial code settings data
  console.log(
    "🔄 CodeGenerator received settings:",
    JSON.parse(JSON.stringify(codeSettings))
  );

  // Log detailed information about maxPax for each code setting
  codeSettings.forEach((setting) => {
    console.log(
      `🔍 Code setting details for ${setting.name || setting.type}:`,
      {
        maxPax: setting.maxPax,
        condition: setting.condition,
        type: setting.type,
        limit: setting.limit,
        unlimited: setting.unlimited,
        hasMaxPax: !!setting.maxPax,
      }
    );
  });

  // Calculate total pax used whenever codes change
  useEffect(() => {
    const calculateTotalPax = () => {
      const total = codes.reduce((sum, code) => sum + (code.pax || 1), 0);
      setTotalPaxUsed(total);
    };
    calculateTotalPax();
  }, [codes]);

  // Debug received code settings and permissions
  useEffect(() => {
    console.log("🎟️ CodeGenerator received:", {
      type,
      codeSettings: codeSettings.length,
      codePermissions: codePermissions.length,
      selectedBrand: selectedBrand?.name,
      settings: codeSettings,
      permissions: codePermissions,
      accessSummary,
    });

    // Add detailed debug of code settings to find missing maxPax
    console.log(
      "🔎 Detailed code settings:",
      codeSettings.map((s) => ({
        name: s.name,
        type: s.type,
        maxPax: s.maxPax,
        limit: s.limit,
        unlimited: s.unlimited,
      }))
    );

    // Log which permissions match the requested code type
    if (type) {
      const matchingPermissions = codePermissions.filter(
        (perm) =>
          perm.type === type ||
          type.includes(perm.type) ||
          perm.type.includes(type)
      );

      console.log(
        `🎯 Permissions matching type "${type}":`,
        matchingPermissions
      );
    }

    // Set the initial selected code type
    if (codePermissions && codePermissions.length > 0) {
      setSelectedCodeType(codePermissions[0].type);
    }

    // Count existing codes
    fetchCodeCounts();
  }, [type, codeSettings, codePermissions, accessSummary, selectedBrand]);

  // Fetch the count of existing codes
  const fetchCodeCounts = async () => {
    if (!selectedEvent) {
      console.log("❌ GENERATOR: No event selected, skipping code count fetch");
      return;
    }

    if (!selectedCodeType) {
      console.log(
        "❌ GENERATOR: No code type selected, skipping code count fetch"
      );
      return;
    }

    // Get the actual type value from the active setting
    const actualType = activeSetting?.type || "custom";

    try {
      console.log(
        `🔍 GENERATOR: Fetching code counts for event=${selectedEvent._id}, type=${selectedCodeType} (actual type=${actualType})`
      );

      // Use the correct API endpoint based on the server routes
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/counts/${
          selectedEvent._id
        }?type=${actualType}&displayType=${encodeURIComponent(
          selectedCodeType
        )}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log(`✅ GENERATOR: Fetched code counts`, response.data);

      // Get the active permission to determine if we should show generated or remaining
      const activePermission = getActivePermission();

      // Update the counts state based on the response
      if (response.data) {
        // Get the actual count from the response
        const actualCount =
          response.data.filteredCount || response.data.count || 0;
        const actualPaxUsed = response.data.paxUsed || 0;

        console.log(
          `📊 GENERATOR: Actual count for ${selectedCodeType}: ${actualCount}, paxUsed: ${actualPaxUsed}`
        );

        // Store the count for this specific code type
        setCodeCountsByType((prev) => ({
          ...prev,
          [selectedCodeType]: {
            count: actualCount,
            paxUsed: actualPaxUsed,
            unlimited: activePermission?.unlimited || false,
            limit: activePermission?.limit || 0,
          },
        }));

        // For unlimited types, show the count of generated codes
        if (activePermission?.unlimited) {
          // Only update if the value has changed significantly to prevent re-renders
          if (Math.abs(codesGenerated - actualCount) > 0) {
            setCodesGenerated(actualCount);
          }
        }
        // For limited types, update the total pax used
        // Only update if the value has changed significantly to prevent re-renders
        if (Math.abs(totalPaxUsed - actualPaxUsed) > 0) {
          setTotalPaxUsed(actualPaxUsed);
        }
      }
    } catch (error) {
      console.log("❌ GENERATOR COUNT ERROR:", error);
      console.log(
        "❌ GENERATOR COUNT ERROR DETAILS:",
        error.response?.data || error.message
      );
    }
  };

  // Fetch complete code settings if they're missing maxPax
  const fetchCompleteCodeSettings = async () => {
    if (!selectedEvent || !selectedCodeType) return;

    // Check if we already have complete settings
    const hasCompleteSettings = codeSettings.some(
      (s) => s.maxPax !== undefined
    );
    if (hasCompleteSettings) return;

    try {
      console.log(
        "⚠️ Code settings missing maxPax, fetching complete settings..."
      );
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code-settings/all/${
          selectedBrand?.id || selectedBrand?._id
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data?.codeSettings) {
        console.log(
          "✅ Fetched complete code settings:",
          response.data.codeSettings
        );
        setAvailableSettings(response.data.codeSettings);

        // Find the matching setting for current code type
        const matchingSetting = response.data.codeSettings.find(
          (s) =>
            s.type === selectedCodeType || s.name.includes(selectedCodeType)
        );

        if (matchingSetting) {
          console.log(
            "🎯 Found complete setting with maxPax:",
            matchingSetting
          );
          setActiveSetting(matchingSetting);
          updateMaxPeopleOptions(matchingSetting);
        }
      }
    } catch (error) {
      console.error("Failed to fetch complete code settings:", error);
    }
  };

  // Fetch event-specific code settings if not provided
  useEffect(() => {
    const fetchEventCodeSettings = async () => {
      if (!selectedEvent) return;

      try {
        console.log(
          "🔍 Fetching event-specific code settings for:",
          selectedEvent._id
        );

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
          console.log("✅ Fetched event code settings:", settings.length);
          setAvailableSettings(settings);

          // Set active setting based on type prop or first available setting
          const matchingSetting =
            settings.find((s) => s.type === type || s.codeType === type) ||
            settings[0];
          if (matchingSetting) {
            console.log("🎯 Setting active setting:", matchingSetting);
            setActiveSetting(matchingSetting);
            setCondition(matchingSetting.condition || "");
            setPax(1); // Reset pax to 1 when changing settings
            updateMaxPeopleOptions(matchingSetting);
          }

          // Update the selectedEvent with additional data if available
          if (
            response.data.eventName ||
            response.data.eventLogo ||
            response.data.primaryColor
          ) {
            console.log("📝 Updating event data with:", {
              name: response.data.eventName,
              logo: response.data.eventLogo ? "Available" : "Not available",
              primaryColor: response.data.primaryColor,
            });

            // Create an updated event object with the new data
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

            // Pass the updated event to any child components that need it
            // This is done by updating the state in the parent component
            if (onEventDataUpdate) {
              onEventDataUpdate(updatedEvent);
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to load event code settings:", error);
        showError("Failed to load code settings");
      }
    };

    if (codeSettings.length === 0) {
      console.log("⚠️ No code settings provided, fetching from event");
      fetchEventCodeSettings();
    } else {
      console.log("✅ Using provided code settings:", codeSettings.length);
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
        console.log(
          "🎯 Setting active setting from provided settings:",
          matchingSetting
        );
        setActiveSetting(matchingSetting);
        setCondition(matchingSetting.condition || "");
        updateMaxPeopleOptions(matchingSetting);

        // If maxPax is missing, try fetching complete settings
        if (matchingSetting.maxPax === undefined) {
          fetchCompleteCodeSettings();
        }
      } else {
        console.warn(
          "⚠️ No matching setting found for type:",
          selectedTypeOrDefault
        );
      }
    }
  }, [selectedEvent, type, codeSettings, selectedCodeType]);

  // Update max people options based on the active setting
  const updateMaxPeopleOptions = (setting) => {
    console.log("🔄 Updating max people options for setting:", setting);

    if (!setting) {
      setMaxPeopleOptions([1]);
      return;
    }

    // Get the maximum allowed people count
    let maxAllowed;
    if (setting.maxPax) {
      maxAllowed = setting.maxPax;
      console.log("📊 Using maxPax from setting:", maxAllowed);
    } else if (setting.name && setting.name.includes("Bottle")) {
      maxAllowed = 5; // Default for Bottle Code
      console.log("📊 Using default maxPax for Bottle:", maxAllowed);
    } else {
      maxAllowed = 1;
      console.log("📊 Using default maxPax:", maxAllowed);
    }

    // Generate array of options from 1 to maxAllowed
    const options = Array.from({ length: maxAllowed }, (_, i) => i + 1);
    setMaxPeopleOptions(options);
    console.log("📋 Updated max people options:", options);

    // Reset pax to 1 when changing options
    setPax(1);
  };

  // Update active setting when code type changes
  useEffect(() => {
    if (selectedCodeType && availableSettings.length > 0) {
      const matchingSetting = availableSettings.find(
        (s) =>
          s.type === selectedCodeType ||
          s.codeType === selectedCodeType ||
          s.name.includes(selectedCodeType)
      );

      if (matchingSetting) {
        console.log(
          "🔄 Updating active setting for new code type:",
          matchingSetting
        );
        setActiveSetting(matchingSetting);

        // Set condition based on code type
        if (selectedCodeType === "Bottle Code") {
          setCondition("1 Free Bottle");
        } else {
          setCondition(matchingSetting.condition || "");
        }

        setPax(1); // Reset pax when changing settings
        fetchCodeCounts(); // Refresh code counts when changing type
        updateMaxPeopleOptions(matchingSetting);

        // If maxPax is missing, try fetching complete settings
        if (matchingSetting.maxPax === undefined) {
          fetchCompleteCodeSettings();
        }
      }
    }
  }, [selectedCodeType, availableSettings]);

  // Find the active permission matching the selected code type
  const getActivePermission = () => {
    if (!selectedCodeType || !codePermissions) return null;
    return codePermissions.find((perm) => perm.type === selectedCodeType);
  };

  // Get matching code setting for the selected code type - used for maxPax
  const getMatchingCodeSetting = () => {
    if (!selectedCodeType || !codeSettings || codeSettings.length === 0)
      return null;

    return codeSettings.find(
      (setting) =>
        setting.name.includes(selectedCodeType) ||
        setting.type === selectedCodeType
    );
  };

  // Fetch codes for the current event and type - completely rewritten for stability
  const fetchCodes = async () => {
    if (!selectedEvent) {
      console.log("❌ GENERATOR: No event selected, skipping code fetch");
      return;
    }

    if (!selectedCodeType) {
      console.log("❌ GENERATOR: No code type selected, skipping code fetch");
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingCodes) {
      console.log(
        "⚠️ GENERATOR: Already fetching codes, skipping duplicate fetch"
      );
      return;
    }

    // Get the actual type value from the active setting
    const actualType = activeSetting?.type || "custom";

    try {
      setIsFetchingCodes(true);
      console.log(
        `🔄 GENERATOR: Fetching codes for type=${selectedCodeType} (actual type=${actualType})`
      );

      // Use the correct API endpoint based on the server routes
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/events/${selectedEvent._id}/${actualType}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Get the codes array from the response
      const allCodes = response.data.codes || response.data;

      console.log(`✅ GENERATOR: Fetched ${allCodes.length} total codes`);

      // Filter codes by metadata.codeType to match the selected code type
      const filteredCodes = allCodes.filter(
        (code) =>
          code.metadata?.codeType === selectedCodeType ||
          code.metadata?.settingName === selectedCodeType ||
          code.metadata?.displayName === selectedCodeType ||
          code.type === selectedCodeType
      );

      console.log(
        `📋 GENERATOR: ${filteredCodes.length} codes for ${selectedCodeType}`
      );

      // Store filtered codes by type in the ref
      filteredCodesByTypeRef.current[selectedCodeType] = filteredCodes;

      // Update the codes state
      setCodes(filteredCodes);

      // IMPORTANT: Also update codesGenerated directly with the actual count
      if (filteredCodes.length > 0) {
        setCodesGenerated(filteredCodes.length);
      }

      // Update the count in codeCountsByType
      setCodeCountsByType((prev) => {
        const currentTypeCounts = prev[selectedCodeType] || {
          count: 0,
          paxUsed: 0,
          unlimited: false,
          limit: 0,
        };

        // Calculate paxUsed from the filtered codes
        const paxUsed = filteredCodes.reduce(
          (sum, code) => sum + (code.paxChecked || 0),
          0
        );

        console.log(
          `📊 GENERATOR: Updated count from fetch: ${filteredCodes.length}, paxUsed: ${paxUsed}`
        );

        return {
          ...prev,
          [selectedCodeType]: {
            ...currentTypeCounts,
            count: filteredCodes.length,
            paxUsed: paxUsed,
          },
        };
      });

      // Mark codes as loaded
      setCodesLoaded(true);
    } catch (error) {
      console.error("❌ GENERATOR: Error fetching codes:", error);
      // Don't clear codes on error to prevent flickering
    } finally {
      setIsFetchingCodes(false);
    }
  };

  // Simplified useEffect for fetching codes - only fetch when necessary
  useEffect(() => {
    if (selectedEvent && selectedCodeType && !isFetchingCodes) {
      console.log(`🔄 GENERATOR: Initial code fetch for ${selectedCodeType}`);

      // Always fetch codes on component mount or when code type changes
      // This ensures we have the most up-to-date data
      fetchCodes();

      // Also fetch counts to ensure they're in sync
      fetchCodeCounts();
    }
  }, [selectedEvent, selectedCodeType]);

  // Reset codesLoaded when code type changes to force a refresh
  useEffect(() => {
    if (selectedCodeType) {
      setCodesLoaded(false);

      // If we already have codes in the ref for this type, use them immediately
      // This prevents flickering while waiting for the API
      if (filteredCodesByTypeRef.current[selectedCodeType]?.length > 0) {
        const cachedCodes = filteredCodesByTypeRef.current[selectedCodeType];
        console.log(
          `📋 GENERATOR: Using ${cachedCodes.length} cached codes for ${selectedCodeType}`
        );

        setCodes(cachedCodes);
        setCodesGenerated(cachedCodes.length);
      }
    }
  }, [selectedCodeType]);

  // Simplified handleCode function to ensure stable state updates
  const handleCode = async () => {
    console.group("🔍 GENERATOR: Handle Code");
    console.log(
      "Selected Event:",
      selectedEvent
        ? {
            _id: selectedEvent._id,
            name: selectedEvent.name,
          }
        : "undefined"
    );
    console.log(
      "Active Setting:",
      activeSetting
        ? {
            _id: activeSetting._id,
            name: activeSetting.name,
            type: activeSetting.type,
          }
        : "undefined"
    );
    console.log("Name:", name);
    console.log("Pax:", pax);
    console.log("Condition:", condition);
    console.log("Selected Code Type:", selectedCodeType);
    console.groupEnd();

    if (!selectedEvent) {
      console.error("❌ GENERATOR: No event selected, cannot generate code");
      showError("Please select an event first");
      return;
    }

    if (!activeSetting) {
      console.error("❌ GENERATOR: No active setting selected");
      showError("Please select a code type");
      return;
    }

    const eventId = selectedEvent._id;

    if (!name) {
      showError("Please enter a name");
      return;
    }

    if (pax < 1) {
      showError("Please select at least 1 person");
      return;
    }

    // Check if we're exceeding the maximum allowed pax
    if (isPaxExceedingMaximum()) {
      showError(`Maximum ${getMaxPeopleAllowed()} people allowed`);
      return;
    }

    showLoading("Generating code...");

    try {
      // Extract user information for host and username
      const hostName = user?.firstName || user?.username || "Unknown";
      const hostUsername = user?.username || "unknown";

      // Prepare the code data - ensure it matches the Codes model schema
      const codeData = {
        eventId,
        name,
        pax, // This will be mapped to maxPax in the server
        condition: condition || activeSetting.condition || "",
        type: activeSetting.type, // Use the actual type from the setting
        hostName,
        hostUsername,
        tableNumber: tableNumber || "",
        codeSettingId: activeSetting._id, // Reference to the CodeSettings model
        createdBy: user?._id,
        metadata: {
          codeType: selectedCodeType, // The display type (e.g., "Bottle Code")
          settingId: activeSetting._id || "",
          settingName: activeSetting.name || "",
          displayName: selectedCodeType,
          actualType: activeSetting.type, // The actual type in the database (e.g., "custom")
          generatedFrom: "CodeGenerator",
        },
        // Add any additional fields that might be needed by the Codes model
        maxPax: pax, // Explicitly set maxPax to match the Codes model
        paxChecked: 0, // Initialize paxChecked to 0
        status: "active", // Set the initial status
        isDynamic: true, // Mark as a dynamically generated code
      };

      console.log(`🔍 GENERATOR: Creating code with data:`, codeData);

      // Use the correct API endpoint based on the server routes
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

      console.log(`✅ GENERATOR: Code created successfully:`, response.data);
      showSuccess("Code generated successfully!");

      // Reset form fields
      setName("");
      setPax(1);
      setCondition("");
      setTableNumber("");

      // Refresh code counts for this specific type
      fetchCodeCounts();

      // Get the new code from the response
      const newCode = response.data.code || response.data;

      // Add the new code to the codes array
      if (newCode) {
        setCodes((prevCodes) => {
          // Check if code already exists
          const exists = prevCodes.some((code) => code._id === newCode._id);
          if (exists) return prevCodes;

          // Add the new code
          const updatedCodes = [...prevCodes, newCode];

          // Update the ref as well
          filteredCodesByTypeRef.current[selectedCodeType] = updatedCodes;

          // Update the count for this specific code type
          setCodeCountsByType((prev) => {
            const currentTypeCounts = prev[selectedCodeType] || {
              count: 0,
              paxUsed: 0,
              unlimited: false,
              limit: 0,
            };

            // Increment the count and paxUsed
            const newCount = currentTypeCounts.count + 1;
            const newPaxUsed = currentTypeCounts.paxUsed + parseInt(pax);

            console.log(
              `📊 GENERATOR: Updated count for ${selectedCodeType}: ${newCount}, paxUsed: ${newPaxUsed}`
            );

            // Also update the codesGenerated state if this is an unlimited type
            if (currentTypeCounts.unlimited) {
              setCodesGenerated(newCount);
            }

            return {
              ...prev,
              [selectedCodeType]: {
                ...currentTypeCounts,
                count: newCount,
                paxUsed: newPaxUsed,
              },
            };
          });

          return updatedCodes;
        });
      } else {
        // If we don't have the new code data, do a full refresh
        setCodesLoaded(false); // This will trigger a re-fetch
      }

      // Refresh counts if needed
      if (refreshCounts) {
        refreshCounts();
      }
    } catch (error) {
      console.error("❌ GENERATOR: Error creating code:", error);
      showError(error.response?.data?.message || "Failed to generate code");
    }
  };

  // Get the counter text based on whether there's a limit or not
  const getCounterText = () => {
    const activePermission = getActivePermission();
    if (!activePermission) return "Generated";

    if (activePermission.unlimited) {
      return "Generated";
    } else {
      return "Remaining";
    }
  };

  // Get the counter value for the current code type
  const getCounterValue = () => {
    const activePermission = getActivePermission();
    if (!activePermission) return "0";

    // IMPORTANT: Use the actual codes array length as the primary source of truth
    const actualCodesCount = codes.length;

    // Get the counts for the current code type
    const currentTypeCounts = codeCountsByType[selectedCodeType] || {
      count: 0,
      paxUsed: 0,
      unlimited: activePermission.unlimited,
      limit: activePermission.limit,
    };

    console.log(`📊 COUNTER: Getting value for ${selectedCodeType}:`, {
      unlimited: currentTypeCounts.unlimited,
      limit: currentTypeCounts.limit,
      count: currentTypeCounts.count,
      paxUsed: currentTypeCounts.paxUsed,
      actualCodesCount: actualCodesCount,
    });

    // For unlimited types, show the actual count of codes
    if (currentTypeCounts.unlimited) {
      // Use the actual codes array length if it's greater than the stored count
      const displayCount = Math.max(actualCodesCount, currentTypeCounts.count);
      console.log(
        `📊 COUNTER: Unlimited type, showing actual code count: ${displayCount} (stored: ${currentTypeCounts.count}, actual: ${actualCodesCount})`
      );
      return displayCount.toString();
    } else {
      // For limited types, calculate remaining based on the limit and used pax
      const remaining = Math.max(
        0,
        currentTypeCounts.limit - currentTypeCounts.paxUsed
      );
      console.log(
        `📊 COUNTER: Limited type, showing remaining: ${remaining} (limit: ${currentTypeCounts.limit}, used: ${currentTypeCounts.paxUsed})`
      );
      return remaining.toString();
    }
  };

  // Determine if we should show the people selector
  const shouldShowPeopleSelector = () => {
    if (!activeSetting) return false;

    // If we have maxPax defined and it's greater than 1, show the selector
    if (activeSetting.maxPax && activeSetting.maxPax > 1) {
      return true;
    }

    return false;
  };

  // Get max people allowed for current code type
  const getMaxPeopleAllowed = () => {
    if (!activeSetting) return 1;

    // If maxPax is defined, use it
    if (activeSetting.maxPax) {
      return activeSetting.maxPax;
    }

    // Default to 1 if no maxPax specified
    return 1;
  };

  // Check if pax exceeds maxPax
  const isPaxExceedingMaximum = () => {
    const maxAllowed = getMaxPeopleAllowed();
    return pax > maxAllowed;
  };

  // Calculate total pax used
  const calculateTotalPax = () => {
    if (!activeSetting) return 0;
    return totalPaxUsed;
  };

  // Add debugging for codes state
  useEffect(() => {
    console.log(
      `📋 GENERATOR CODES: ${codes.length} codes for ${selectedCodeType}`
    );
    codes.forEach((code) => {
      console.log(
        `📋 GENERATOR CODE: id=${code._id}, type=${code.type}, metadata.codeType=${code.metadata?.codeType}`
      );
    });
  }, [codes, selectedCodeType]);

  // Add debugging for selectedEvent
  useEffect(() => {
    console.log(`🔍 GENERATOR: selectedEvent=${selectedEvent?._id}`);
  }, [selectedEvent]);

  // Add a ref to store filtered codes by type
  const filteredCodesByTypeRef = React.useRef({});

  // Add more detailed debugging for props
  useEffect(() => {
    console.group("🔍 GENERATOR PROPS");
    console.log("User:", user?._id);
    console.log("Type:", type);
    console.log(
      "Selected Brand:",
      selectedBrand
        ? {
            _id: selectedBrand._id,
            name: selectedBrand.name,
          }
        : "undefined"
    );
    console.log(
      "Selected Event:",
      selectedEvent
        ? {
            _id: selectedEvent._id,
            name: selectedEvent.name,
            date: selectedEvent.date,
            user: selectedEvent.user,
            brand: selectedEvent.brand,
            // Log the entire object for debugging
            fullObject: selectedEvent,
          }
        : "undefined"
    );
    console.log("Code Settings:", codeSettings?.length);
    console.log("Code Permissions:", codePermissions?.length);
    console.groupEnd();
  }, [user, type, selectedBrand, selectedEvent, codeSettings, codePermissions]);

  // Add a warning if selectedEvent is undefined
  useEffect(() => {
    if (!selectedEvent) {
      console.warn(
        "⚠️ GENERATOR: No event selected. Please select an event in the header."
      );
      showError("Please select an event to generate codes");
    }
  }, [selectedEvent]);

  // Initialize counts for all code types when the component mounts
  useEffect(() => {
    if (selectedEvent && codePermissions && codePermissions.length > 0) {
      console.log(`🔄 GENERATOR: Initializing counts for all code types`);

      // Fetch counts for each code type
      const fetchAllCounts = async () => {
        for (const permission of codePermissions) {
          // Skip if we already have counts for this type
          if (codeCountsByType[permission.type]) continue;

          // Find the matching code setting
          const matchingSetting = codeSettings.find(
            (setting) =>
              setting.type === permission.type ||
              setting.name === permission.type
          );

          if (!matchingSetting) continue;

          try {
            console.log(`🔍 GENERATOR: Fetching counts for ${permission.type}`);

            const response = await axios.get(
              `${process.env.REACT_APP_API_BASE_URL}/codes/counts/${
                selectedEvent._id
              }?type=${matchingSetting.type}&displayType=${encodeURIComponent(
                permission.type
              )}`,
              {
                withCredentials: true,
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            if (response.data) {
              setCodeCountsByType((prev) => ({
                ...prev,
                [permission.type]: {
                  count: response.data.count || 0,
                  paxUsed: response.data.paxUsed || 0,
                  unlimited: permission.unlimited || false,
                  limit: permission.limit || 0,
                },
              }));
            }
          } catch (error) {
            console.error(
              `❌ GENERATOR: Error fetching counts for ${permission.type}:`,
              error
            );
          }
        }
      };

      fetchAllCounts();
    }
  }, [selectedEvent, codePermissions, codeSettings]);

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
      <Navigation onBack={onClose} title={`${type} Codes`} />
      <div className="code-generator-container">
        {/* Add event logo container */}
        <div className="brand-logo-container">
          {selectedEvent && (
            <>
              {/* Use brand logo if available */}
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
                      ? {
                          borderColor: selectedEvent.primaryColor,
                        }
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
                      ? {
                          borderColor: selectedEvent.primaryColor,
                        }
                      : {}
                  }
                />
              ) : (
                <div
                  className="code-logo-placeholder"
                  style={
                    selectedEvent.primaryColor
                      ? {
                          backgroundColor: selectedEvent.primaryColor,
                        }
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
          <div
            className="counter-container"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              borderRadius: "0.5rem",
              backgroundColor: "#1a1a1a",
              boxShadow:
                "0 4px 15px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 200, 7, 0.1)",
              margin: "1rem auto",
              maxWidth: "220px",
              border: "1px solid rgba(255, 200, 7, 0.3)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Add glassy overlay effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent)",
                borderTopLeftRadius: "0.5rem",
                borderTopRightRadius: "0.5rem",
              }}
            />
            <div
              className="counter-label"
              style={{
                fontSize: "1rem",
                fontWeight: "500",
                color: "#ffc807",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.1rem",
                textShadow: "0 0 5px rgba(255, 200, 7, 0.5)",
                position: "relative",
                zIndex: 1,
              }}
            >
              {getCounterText()}
            </div>
            <div
              className="counter-value"
              style={{
                fontSize: "3rem",
                fontWeight: "700",
                color: "#ffc807",
                textShadow: "0 0 10px rgba(255, 200, 7, 0.7)",
                fontFamily: "'Digital-7', monospace, 'Courier New', Courier",
                transition: "all 0.3s ease",
                animation: "pulse 2s infinite ease-in-out",
                position: "relative",
                zIndex: 1,
              }}
            >
              {getCounterValue()}
            </div>
          </div>
        </div>

        {/* Always show Code Generator View */}
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
                    onClick={() => setSelectedCodeType(permission.type)}
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
              disabled={!name || pax < 1 || !activeSetting}
              onClick={handleCode}
            >
              Generate Code
            </button>
          </div>
        </div>

        {/* Always show Code Management View */}
        <div className="code-management-container">
          <CodeManagement
            user={user}
            type={selectedCodeType}
            setCodes={(newCodes) => {
              console.log(
                `📋 GENERATOR: CodeManagement updated codes: ${newCodes.length}`
              );
              setCodes(newCodes);
              filteredCodesByTypeRef.current[selectedCodeType] = newCodes;
            }}
            codes={codes}
            refreshCodes={() => {
              console.log(
                `🔄 GENERATOR: CodeManagement requested code refresh`
              );
              setCodesLoaded(false); // This will trigger a re-fetch
            }}
            refreshCounts={refreshCounts}
            currentEventDate={currentEventDate}
            counts={codesGenerated}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            isStartingEvent={isStartingEvent}
            dataInterval={dataInterval}
            selectedEvent={selectedEvent}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CodeGenerator;
