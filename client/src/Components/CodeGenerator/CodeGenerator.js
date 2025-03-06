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
        // For unlimited types, show the count of generated codes
        if (activePermission?.unlimited) {
          // Only update if the value has changed significantly to prevent re-renders
          if (Math.abs(codesGenerated - (response.data.count || 0)) > 0) {
            setCodesGenerated(response.data.count || 0);
          }
        }
        // For limited types, update the total pax used
        // Only update if the value has changed significantly to prevent re-renders
        if (Math.abs(totalPaxUsed - (response.data.paxUsed || 0)) > 0) {
          setTotalPaxUsed(response.data.paxUsed || 0);
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

      // Prepare the code data
      const codeData = {
        eventId,
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

      // Refresh code counts and codes after a short delay
      setTimeout(() => {
        console.log("🔄 GENERATOR: Refreshing data after code generation");
        fetchCodeCounts();
        fetchCodes();
        if (refreshCounts) {
          refreshCounts();
        }
      }, 1000);
    } catch (error) {
      console.error("❌ GENERATOR ERROR:", error);
      showError(error.response?.data?.message || "Failed to generate code");
    }
  };

  // Get the counter display based on whether there's a limit or not
  const getCounterText = () => {
    const activePermission = getActivePermission();
    if (!activePermission) return "Generated";

    if (activePermission.unlimited) {
      return "Generated";
    } else {
      return "Remaining";
    }
  };

  // Get the counter value
  const getCounterValue = () => {
    const activePermission = getActivePermission();
    if (!activePermission) return "0";

    console.log(`📊 COUNTER: Getting value for ${selectedCodeType}:`, {
      unlimited: activePermission.unlimited,
      limit: activePermission.limit,
      codesGenerated,
      totalPaxUsed,
    });

    if (activePermission.unlimited) {
      // Show the count of codes for this specific type
      console.log(
        `📊 COUNTER: Unlimited type, showing generated count: ${codesGenerated}`
      );
      return codesGenerated.toString();
    } else {
      // Calculate remaining based on the limit and used pax for this specific type
      // Use the ref to stabilize the value and prevent jumping
      if (!counterValueRef.current[selectedCodeType]) {
        const remaining = Math.max(0, activePermission.limit - totalPaxUsed);
        counterValueRef.current[selectedCodeType] = remaining;
      }

      // Only update the ref value if there's a significant change
      const newRemaining = Math.max(0, activePermission.limit - totalPaxUsed);
      if (
        Math.abs(counterValueRef.current[selectedCodeType] - newRemaining) > 1
      ) {
        counterValueRef.current[selectedCodeType] = newRemaining;
      }

      console.log(
        `📊 COUNTER: Limited type, showing remaining: ${counterValueRef.current[selectedCodeType]} (limit: ${activePermission.limit}, used: ${totalPaxUsed})`
      );
      return counterValueRef.current[selectedCodeType].toString();
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

  // Fetch codes for the current event and type
  const fetchCodes = async () => {
    if (!selectedEvent) {
      console.log("❌ GENERATOR: No event selected, skipping code fetch");
      return;
    }

    if (!selectedCodeType) {
      console.log("❌ GENERATOR: No code type selected, skipping code fetch");
      return;
    }

    // Get the actual type value from the active setting
    const actualType = activeSetting?.type || "custom";

    try {
      console.group("🔍 GENERATOR: Fetching codes");
      console.log("Event ID:", selectedEvent._id);
      console.log("Selected Code Type:", selectedCodeType);
      console.log("Actual Type for API:", actualType);
      console.log(
        "API URL:",
        `${process.env.REACT_APP_API_BASE_URL}/codes/events/${selectedEvent._id}/${actualType}`
      );
      console.groupEnd();

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

      console.log(`✅ GENERATOR: Fetched ${response.data.length} codes`);

      // Filter codes by metadata.codeType to match the selected code type
      const filteredCodes = response.data.filter(
        (code) =>
          code.metadata?.codeType === selectedCodeType ||
          code.metadata?.settingName === selectedCodeType
      );

      console.log(
        `📋 GENERATOR CODES: ${filteredCodes.length} codes for ${selectedCodeType}`
      );

      // Update the codes state
      setCodes(filteredCodes);
    } catch (error) {
      console.group("❌ GENERATOR ERROR");
      console.log("Error:", error);
      console.log("Error Details:", error.response?.data || error.message);
      console.log("Status:", error.response?.status);
      console.log("Status Text:", error.response?.statusText);
      console.groupEnd();
    }
  };

  // Fetch codes when component mounts or when selectedCodeType changes
  useEffect(() => {
    if (selectedEvent && selectedCodeType) {
      console.log(
        `🔄 GENERATOR: Refreshing codes for type=${selectedCodeType}`
      );
      fetchCodeCounts();
      fetchCodes();
    }
  }, [selectedEvent, selectedCodeType]);

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
<<<<<<< HEAD
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
              <div
                className="brand-name"
                style={
                  selectedEvent.primaryColor
                    ? {
                        color: selectedEvent.primaryColor,
                      }
                    : {}
                }
              >
                {selectedEvent.name ||
                  selectedEvent.title ||
                  (selectedBrand ? selectedBrand.name : "Guest Code")}
              </div>
            </>
          )}
        </div>

        <div className="code-generator-header">
          <div
            className="code-counter"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: "1rem 0",
              position: "relative",
            }}
          >
            <div
              className="counter-label"
              style={{
                fontSize: "0.9rem",
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: "0.5rem",
                fontWeight: "500",
                textTransform: "uppercase",
                letterSpacing: "0.05rem",
              }}
            >
              {getCounterText()}
            </div>
            <div
              className="counter-value"
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                color: selectedEvent?.primaryColor || "#ffc807",
                textShadow: "0 2px 10px rgba(255, 200, 7, 0.3)",
                transition: "all 0.3s ease",
                animation: "pulse 2s infinite ease-in-out",
              }}
            >
              {getCounterValue()}
            </div>
=======
    <div className="code">
      <div className="code-wrapper">
        <Toaster />
        <Navigation onBack={onClose} />
        <h1 className="code-title">{`${type} Code`}</h1>

        <img className="code-logo" src="/image/logo_w.svg" alt="Logo" />

        <div className="code-count">
          <h4>
            {limit === undefined || limit === 0
              ? "This Week's Count"
              : "Remaining This Week"}
          </h4>
          <div className="code-count-number">
            <p>{remainingCount}</p>
>>>>>>> master
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
            setCodes={setCodes}
            codes={filteredCodesByTypeRef.current[selectedCodeType] || codes}
            refreshCodes={fetchCodes}
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
