import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./CodeGenerator.scss";
import CodeManagement from "../CodeManagement/CodeManagement";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import CodeSettings from "../CodeSettings/CodeSettings";

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

  // Calculate total pax used whenever codes change
  useEffect(() => {
    const calculateTotalPax = () => {
      const total = codes.reduce((sum, code) => sum + (code.pax || 1), 0);
      setTotalPaxUsed(total);
    };
    calculateTotalPax();
  }, [codes]);

  // Fetch event-specific code settings if not provided
  useEffect(() => {
    const fetchEventCodeSettings = async () => {
      if (!selectedEvent?._id) return;

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/code-settings/events/${selectedEvent._id}`,
          {
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
            settings.find((s) => s.type === type) || settings[0];
          if (matchingSetting) {
            setActiveSetting(matchingSetting);
            setCondition(matchingSetting.condition || "");
            setPax(1); // Reset pax to 1 when changing settings
          }
        }
      } catch (error) {
        console.error("Error fetching code settings:", error);
        toast.error("Failed to load code settings");
      }
    };

    if (codeSettings.length === 0) {
      fetchEventCodeSettings();
    } else {
      const enabledSettings = codeSettings.filter((s) => s.isEnabled);
      setAvailableSettings(enabledSettings);
      const matchingSetting =
        enabledSettings.find((s) => s.type === type) || enabledSettings[0];
      if (matchingSetting) {
        setActiveSetting(matchingSetting);
        setCondition(matchingSetting.condition || "");
      }
    }
  }, [selectedEvent, type, codeSettings]);

  const handleCode = async () => {
    if (!activeSetting) {
      toast.error("Please select a code type.");
      return;
    }

    if (!name) {
      toast.error("Please enter a name.");
      return;
    }

    // Check pax against maxPax setting
    if (pax > (activeSetting.maxPax || 5)) {
      toast.error(`Maximum ${activeSetting.maxPax || 5} people allowed.`);
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

    toast.loading(`Generating ${activeSetting.name}...`);

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
        toast.success(`${activeSetting.name} generated!`);

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
      console.error("Code generation error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Error generating code.");
    }
  };

  if (!activeSetting) {
    return (
      <div className="code">
        <div className="code-wrapper">
          <Toaster />
          <Navigation onBack={onClose} />
          <h1 className="code-title">No Code Types Available</h1>
          <p>There are no code types configured for this event.</p>
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
        <h1 className="code-title">{activeSetting.name}</h1>

        {selectedBrand?.logo && (
          <img
            className="code-logo"
            src={selectedBrand.logo}
            alt={`${selectedBrand.name} Logo`}
          />
        )}

        <div className="code-count">
          <h4>
            {activeSetting.limit === 0
              ? "No Limit"
              : `${activeSetting.limit - totalPaxUsed} Remaining`}
          </h4>
        </div>

        <div className="code-admin">
          <CodeSettings
            codeType={activeSetting.type}
            name={name}
            setName={setName}
            pax={pax}
            setPax={setPax}
            maxPax={activeSetting.maxPax}
            condition={condition}
            setCondition={setCondition}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            isEditable={activeSetting.isEditable}
            availableSettings={availableSettings}
            activeSetting={activeSetting}
            setActiveSetting={setActiveSetting}
          />
          <button
            className="code-btn"
            onClick={handleCode}
            style={{ backgroundColor: activeSetting.color }}
          >
            Generate
          </button>
        </div>

        <CodeManagement
          user={user}
          type={activeSetting.type}
          codes={codes}
          setCodes={setCodes}
          refreshCounts={refreshCounts}
          currentEventDate={currentEventDate}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
          isStartingEvent={isStartingEvent}
          dataInterval={dataInterval}
          codeSetting={activeSetting}
        />
      </div>
      <Footer />
    </div>
  );
}

export default CodeGenerator;
