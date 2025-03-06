import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./CodeGenerator.scss";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";

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
}) {
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
    if (!selectedEvent || !selectedCodeType) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code/counts/${selectedEvent._id}`,
        {
          params: { type: selectedCodeType },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        setCodesGenerated(response.data.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch code counts:", error);
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
        }
      } catch (error) {
        console.error("❌ Failed to load event code settings:", error);
        toast.error("Failed to load code settings");
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
        setCondition(matchingSetting.condition || "");
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
    if (!activeSetting) {
      toast.error("Please select a code type.");
      return;
    }

    if (!name) {
      toast.error("Please enter a name.");
      return;
    }

    // Check if pax exceeds maxPax
    if (isPaxExceedingMaximum()) {
      toast.error(
        `Maximum ${getMaxPeopleAllowed()} people allowed for this code type.`
      );
      return;
    }

    // Check against remaining limit
    if (activeSetting.limit && activeSetting.limit > 0) {
      const willExceedLimit = totalPaxUsed + pax > activeSetting.limit;
      if (willExceedLimit) {
        toast.error(
          `Cannot generate code for ${pax} people. Only ${
            activeSetting.limit - totalPaxUsed
          } spots remaining.`
        );
        return;
      }
    }

    toast.loading(`Generating code...`);

    try {
      const data = {
        name,
        event: selectedEvent?._id,
        host: user.firstName || user.username,
        hostId: user._id,
        condition: activeSetting.condition || condition,
        pax,
        paxChecked: 0,
        type: activeSetting.type,
        ...(activeSetting.type === "table" && { tableNumber }),
        settings: activeSetting._id,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/code/generate`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        refreshCounts();
        toast.dismiss();
        toast.success(`Code generated!`);
        setCodesGenerated((prev) => prev + 1);

        // Reset form fields
        setName("");
        setPax(1);
        setCondition("");
        if (activeSetting.type === "table") {
          setTableNumber("");
        }
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error generating code.");
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

    if (activePermission.unlimited) {
      return codesGenerated.toString();
    } else {
      return Math.max(0, activePermission.limit - totalPaxUsed).toString();
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

  if (!activeSetting) {
    return (
      <div className="code">
        <div className="code-wrapper">
          <Toaster />
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
    <div className="code">
      <div className="code-wrapper">
        <Toaster />
        <Navigation onBack={onClose} />

        <div className="header-container">
          {selectedBrand && (
            <div className="brand-logo-container">
              {selectedBrand.logo && (
                <img
                  className="code-logo"
                  src={
                    selectedBrand.logo.medium ||
                    selectedBrand.logo.full ||
                    selectedBrand.logo.thumbnail
                  }
                  alt={`${selectedBrand.name} Logo`}
                />
              )}
              <h3 className="brand-name">{selectedBrand.name}</h3>
            </div>
          )}

          <div className="code-counter">
            <div className="counter-label">{getCounterText()}</div>
            <div className="counter-value">{getCounterValue()}</div>
          </div>
        </div>

        {/* Code Type Selector */}
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
            activeSetting.maxPax &&
            activeSetting.maxPax > 1 && (
              <div className="input-container">
                <select
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value))}
                  className="people-select"
                >
                  {Array.from(
                    { length: getMaxPeopleAllowed() },
                    (_, i) => i + 1
                  ).map((option) => (
                    <option key={option} value={option}>
                      {option} {option === 1 ? "person" : "people"}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {activeSetting.customizableCondition && (
            <div className="input-container">
              <input
                type="text"
                placeholder="Condition (optional)"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              />
            </div>
          )}

          {activeSetting.type === "table" && (
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
            disabled={!name || pax < 1}
            onClick={handleCode}
          >
            Generate Code
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CodeGenerator;
