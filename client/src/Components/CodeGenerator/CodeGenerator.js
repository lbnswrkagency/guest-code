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
  const [codeCountsByType, setCodeCountsByType] = useState({});
  const [isFetchingCodes, setIsFetchingCodes] = useState(false);

  // Reference to store filtered codes by type for better performance
  const filteredCodesByTypeRef = useRef({});

  // Calculate total pax used whenever codes change
  useEffect(() => {
    setTotalPaxUsed(codes.reduce((sum, code) => sum + (code.pax || 1), 0));
  }, [codes]);

  // Initialize code type and fetch counts
  useEffect(() => {
    if (codePermissions?.length > 0) {
      setSelectedCodeType(codePermissions[0].type);
    }
    fetchCodeCounts();
  }, [type, codeSettings, codePermissions, accessSummary, selectedBrand]);

  // Find the active permission matching the selected code type
  const getActivePermission = () => {
    if (!selectedCodeType || !codePermissions) return null;
    return codePermissions.find((perm) => perm.type === selectedCodeType);
  };

  // Fetch the count of existing codes
  const fetchCodeCounts = async () => {
    if (!selectedEvent || !selectedCodeType) return;

    const actualType = activeSetting?.type || "custom";

    try {
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

      const activePermission = getActivePermission();

      if (response.data) {
        const actualCount =
          response.data.filteredCount || response.data.count || 0;
        const actualPaxUsed = response.data.paxUsed || 0;

        setCodeCountsByType((prev) => ({
          ...prev,
          [selectedCodeType]: {
            count: actualCount,
            paxUsed: actualPaxUsed,
            unlimited: activePermission?.unlimited || false,
            limit: activePermission?.limit || 0,
          },
        }));

        if (
          activePermission?.unlimited &&
          Math.abs(codesGenerated - actualCount) > 0
        ) {
          setCodesGenerated(actualCount);
        }

        if (Math.abs(totalPaxUsed - actualPaxUsed) > 0) {
          setTotalPaxUsed(actualPaxUsed);
        }
      }
    } catch (error) {
      // Error handling without console logs
    }
  };

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
        setActiveSetting(matchingSetting);

        // Set condition based on code type
        setCondition(
          selectedCodeType === "Bottle Code"
            ? "1 Free Bottle"
            : matchingSetting.condition || ""
        );

        setPax(1);
        fetchCodeCounts();
        updateMaxPeopleOptions(matchingSetting);
      }
    }
  }, [selectedCodeType, availableSettings]);

  // Fetch codes for the current event and type
  const fetchCodes = async () => {
    if (!selectedEvent || !selectedCodeType || isFetchingCodes) return;

    const actualType = activeSetting?.type || "custom";

    try {
      setIsFetchingCodes(true);

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/codes/events/${selectedEvent._id}/${actualType}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Get and filter codes
      const allCodes = response.data.codes || response.data;
      const filteredCodes = allCodes.filter(
        (code) =>
          code.metadata?.codeType === selectedCodeType ||
          code.metadata?.settingName === selectedCodeType ||
          code.metadata?.displayName === selectedCodeType ||
          code.type === selectedCodeType
      );

      // Store filtered codes by type in the ref and update state
      filteredCodesByTypeRef.current[selectedCodeType] = filteredCodes;
      setCodes(filteredCodes);

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

        return {
          ...prev,
          [selectedCodeType]: {
            ...currentTypeCounts,
            count: filteredCodes.length,
            paxUsed: paxUsed,
          },
        };
      });
    } catch (error) {
      // Error handling without console logs
    } finally {
      setIsFetchingCodes(false);
    }
  };

  // Fetch codes when necessary
  useEffect(() => {
    if (selectedEvent && selectedCodeType && !isFetchingCodes) {
      fetchCodes();
      fetchCodeCounts();
    }
  }, [selectedEvent, selectedCodeType]);

  // Use cached codes when code type changes
  useEffect(() => {
    if (
      selectedCodeType &&
      filteredCodesByTypeRef.current[selectedCodeType]?.length > 0
    ) {
      const cachedCodes = filteredCodesByTypeRef.current[selectedCodeType];
      setCodes(cachedCodes);
      setCodesGenerated(cachedCodes.length);
    }
  }, [selectedCodeType]);

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

      // Add the new code to the codes array
      if (newCode) {
        setCodes((prevCodes) => {
          // Check if code already exists
          if (prevCodes.some((code) => code._id === newCode._id))
            return prevCodes;

          // Add the new code to the beginning of the array instead of the end
          const updatedCodes = [newCode, ...prevCodes];

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
      }

      // Refresh counts if needed
      if (refreshCounts) {
        refreshCounts();
      }

      // Refresh code counts
      fetchCodeCounts();
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
    if (!activePermission) return "0";

    // Use the actual codes array length as the primary source of truth
    const actualCodesCount = codes.length;

    // Get the counts for the current code type
    const currentTypeCounts = codeCountsByType[selectedCodeType] || {
      count: 0,
      paxUsed: 0,
      unlimited: activePermission.unlimited,
      limit: activePermission.limit,
    };

    // For unlimited types, show the actual count of codes
    if (currentTypeCounts.unlimited) {
      return Math.max(actualCodesCount, currentTypeCounts.count).toString();
    }

    // For limited types, calculate remaining based on the limit and used pax
    return Math.max(
      0,
      currentTypeCounts.limit - currentTypeCounts.paxUsed
    ).toString();
  };

  // Initialize counts for all code types
  useEffect(() => {
    if (selectedEvent && codePermissions?.length > 0) {
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
            // Error handling without console logs
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

        {/* Code Management View */}
        <div className="code-management-container">
          <CodeManagement
            user={user}
            type={selectedCodeType}
            setCodes={(newCodes) => {
              setCodes(newCodes);
              filteredCodesByTypeRef.current[selectedCodeType] = newCodes;
            }}
            codes={codes}
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
