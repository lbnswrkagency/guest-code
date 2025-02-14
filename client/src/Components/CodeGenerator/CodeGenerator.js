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
  weeklyCount,
  refreshCounts,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  dataInterval,
  counts,
}) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [condition, setCondition] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [limit, setLimit] = useState(undefined);
  const [remainingCount, setRemainingCount] = useState(undefined);
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

  // Update limits based on user type and total pax used
  useEffect(() => {
    const newLimit =
      type === "Backstage"
        ? user.backstageCodeLimit
        : type === "Friends"
        ? user.friendsCodeLimit
        : type === "Table"
        ? user.tableCodeLimit
        : undefined;

    setLimit(newLimit === 0 ? undefined : newLimit);

    // Calculate remaining count based on total pax used instead of weeklyCount
    setRemainingCount(
      newLimit === 0 || newLimit === undefined
        ? weeklyCount
        : newLimit - totalPaxUsed
    );
  }, [user, type, weeklyCount, totalPaxUsed]);

  const handleCode = async () => {
    if (!name) {
      toast.error("Please enter a name.");
      return;
    }

    // Enforce maximum pax of 5
    if (pax > 5) {
      toast.error("Maximum 5 people allowed.");
      return;
    }

    // Check against remaining count using pax
    if (limit !== undefined && limit !== 0) {
      const willExceedLimit = totalPaxUsed + pax > limit;
      if (willExceedLimit) {
        toast.error(
          `Cannot generate code for ${pax} people. Only ${remainingCount} spots remaining.`
        );
        return;
      }
    }

    toast.loading(`Generating ${type} Code...`);

    try {
      const data = {
        name,
        event: user.events,
        host: user.firstName || user.username,
        hostId: user._id,
        condition: conditionText(type, condition),
        pax: pax,
        paxChecked: 0,
        ...(type === "Table" && { tableNumber }),
      };

      if (type === "Table") {
        const isBackstageTable = [
          "B1",
          "B2",
          "B3",
          "B4",
          "B5",
          "P1",
          "P2",
          "P3",
          "P4",
          "P5",
          "P6",
        ].includes(tableNumber);
        data.backstagePass = isBackstageTable;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/code/${type.toLowerCase()}/add`,
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
        toast.success(`${type} Code generated!`);

        // Reset form fields
        setName("");
        setPax(1);
        setCondition("");
        if (type === "Table") {
          setTableNumber("");
        }
      }
    } catch (error) {
      toast.dismiss();
      console.error("Code generation error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Error generating code.");
    }
  };

  const conditionText = (type, condition) => {
    if (type === "Friends") {
      return condition || "STANDARD ENTRANCE";
    } else if (type === "Backstage") {
      return "BACKSTAGE ACCESS ALL NIGHT";
    } else if (type === "Table") {
      return "TABLE RESERVATION";
    } else {
      return "CODE CONDITION";
    }
  };

  return (
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
          </div>
        </div>

        <div className="code-admin">
          <CodeSettings
            codeType={type}
            name={name}
            setName={setName}
            pax={pax}
            setPax={setPax}
            condition={condition}
            setCondition={setCondition}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            counts={counts}
          />
          <button className="code-btn" onClick={handleCode}>
            Generate
          </button>
        </div>

        <CodeManagement
          user={user}
          type={type}
          codes={codes}
          setCodes={setCodes}
          weeklyCount={weeklyCount}
          refreshCounts={refreshCounts}
          currentEventDate={currentEventDate}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
          isStartingEvent={isStartingEvent}
          counts={counts}
          dataInterval={dataInterval}
        />
      </div>
      <Footer />
    </div>
  );
}

export default CodeGenerator;
