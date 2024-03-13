import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./CodeGenerator.scss";
import CodeManagement from "../CodeManagement/CodeManagement";

function CodeGenerator({ user, onClose, type, weeklyCount, refreshCounts }) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState("1"); // For Table Codes
  const [tableNumber, setTableNumber] = useState(""); // For Table Codes
  const [downloadUrl, setDownloadUrl] = useState("");
  const [limit, setLimit] = useState(undefined);
  const [remainingCount, setRemainingCount] = useState(undefined);
  const [codes, setCodes] = useState([]);

  useEffect(() => {
    const newLimit =
      type === "Backstage"
        ? user.backstageCodeLimit
        : type === "Friends"
        ? user.friendsCodeLimit
        : undefined;
    setLimit(newLimit);
    setRemainingCount(newLimit ? newLimit - weeklyCount : weeklyCount);
  }, [user, type, weeklyCount, limit]);

  const handleCode = async () => {
    if (!name || (type === "Table" && (!pax || !tableNumber))) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Adjust logic for Table codes to bypass limit checks
    if (
      (type === "Friends" || type === "Backstage") &&
      limit !== undefined &&
      limit > 0 &&
      remainingCount <= 0
    ) {
      toast.error("You have reached your limit for this week.");
      return;
    }

    let data = {
      name,
      event: user.events,
      host: user.name,
      condition: conditionText(type),
      hostId: user._id,
    };

    // Include pax and tableNumber for Table codes
    if (type === "Table") {
      data.pax = pax;
      data.tableNumber = tableNumber;
    } else {
      // Assume pax: 1 for Friends and Backstage for compatibility with previous structure
      data.pax = 1;
      data.paxChecked = 0;
      data.date = new Date().toLocaleDateString("en-GB");
    }

    toast.loading(`Generating ${type} Code...`);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/code/${type.toLowerCase()}/add`,
        data,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
      refreshCounts();
      toast.success(`${type} Code generated!`);
      setTableNumber("");
      toast.dismiss();
      // Adjust remainingCount for Friends and Backstage
      if (type === "Friends" || type === "Backstage") {
        if (limit > 0) {
          setRemainingCount((prev) => Math.max(prev - 1, 0));
        } else {
          setRemainingCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      toast.error("Error generating code.");
      console.error("Code generation error:", error);
    }
  };

  // Helper to determine condition text based on code type
  const conditionText = (type) => {
    return type === "Friends"
      ? "FREE ENTRANCE ALL NIGHT"
      : type === "Backstage"
      ? "BACKSTAGE ACCESS ALL NIGHT"
      : "";
  };

  return (
    <div className="code">
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        <img src="/image/back-icon.svg" alt="Back" />
      </div>
      <img
        className="code-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt="Logo"
      />
      <h1 className="code-title">{`${type}-Code`}</h1>
      <div className="code-count">
        <h4>{limit ? "Remaining This Week" : "This Week's Count"}</h4>
        <div className="code-count-number">
          <p>{remainingCount}</p>
        </div>
      </div>
      <div className="code-admin">
        <input
          className="code-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {type === "Table" && (
          <>
            <select
              className="code-select"
              value={pax}
              onChange={(e) => setPax(e.target.value)}
            >
              {[...Array(10).keys()].map((n) => (
                <option key={n + 1} value={n + 1}>
                  {n + 1} Pax
                </option>
              ))}
            </select>

            <select
              className="code-select"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            >
              <option value="" disabled>
                Select Table Number
              </option>
              <optgroup label="Backstage Tables">
                {["B11", "B12", "B3", "B4", "B5", "E1", "E2"].map((table) => (
                  <option
                    key={table}
                    value={table}
                    disabled={codes.some((code) => code.tableNumber === table)}
                  >
                    {table}
                  </option>
                ))}
              </optgroup>
              <optgroup label="DJ Tables">
                {["B13", "B14"].map((table) => (
                  <option
                    key={table}
                    value={table}
                    disabled={codes.some((code) => code.tableNumber === table)}
                  >
                    {table}
                  </option>
                ))}
              </optgroup>
              <optgroup label="VIP Tables">
                {[
                  "K1",
                  "K2",
                  "K3",
                  "K4",
                  "K5",
                  "K6",
                  "K7",
                  "K8",
                  "K9",
                  "K10",
                ].map((table) => (
                  <option
                    key={table}
                    value={table}
                    disabled={codes.some((code) => code.tableNumber === table)}
                  >
                    {table}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Premium Tables">
                {[
                  "A1",
                  "A2",
                  "A3",
                  "A4",
                  "A5",
                  "A6",
                  "A7",
                  "A8",
                  "A9",
                  "A10",
                  "D1",
                  "D2",
                  "D3",
                ].map((table) => (
                  <option
                    key={table}
                    value={table}
                    disabled={codes.some((code) => code.tableNumber === table)}
                  >
                    {table}
                  </option>
                ))}
              </optgroup>
            </select>
          </>
        )}
        <button className="code-btn" onClick={handleCode}>
          Generate
        </button>
      </div>
      {/* {downloadUrl && (
        <div className="code-preview">
          <a href={downloadUrl} download={`${type.toLowerCase()}-code.png`}>
            Download Code
          </a>
          <img src={downloadUrl} alt="Code Preview" />
        </div>
      )} */}
      <CodeManagement
        user={user}
        type={type}
        codes={codes}
        setCodes={setCodes}
        weeklyCount={weeklyCount}
        refreshCounts={refreshCounts}
      />
    </div>
  );
}

export default CodeGenerator;
