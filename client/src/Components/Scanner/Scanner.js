import React, { useState } from "react";

import { toast } from "react-toastify";
import "./Scanner.scss";

function Scanner() {
  const [scanResult, setScanResult] = useState("");
  const [paxChecked, setPaxChecked] = useState(0);
  const [scanning, setScanning] = useState(true);

  const handleScan = (data) => {
    if (data) {
      setScanResult(data);
      setScanning(false); // Pause scanning

      // TODO: Send request to backend to validate ticket
      // If valid, set paxChecked from response
      // Example: setPaxChecked(response.paxChecked);

      // Display toast for valid ticket
      toast.success("Successfully scanned");
    }
  };

  const handleError = (err) => {
    console.error(err);
    toast.error("Scanning error");
  };

  const increasePax = () => {
    // TODO: Send update request to backend to increase paxChecked
    setPaxChecked(paxChecked + 1);
    toast.info("Checked in");
  };

  const decreasePax = () => {
    // TODO: Send update request to backend to decrease paxChecked
    if (paxChecked > 0) {
      setPaxChecked(paxChecked - 1);
      toast.info("Checked out");
    }
  };

  const resumeScanning = () => {
    setScanning(true);
    setScanResult("");
  };

  return (
    <div className="scanner">
      {scanning ? (
        <div className="test"></div>
      ) : (
        <div>
          <p>Scanned Result: {scanResult}</p>
          <button onClick={resumeScanning}>Scan Again</button>
        </div>
      )}
      <div>
        <button onClick={decreasePax}>Decrease</button>
        <span>Pax Checked: {paxChecked}</span>
        <button onClick={increasePax}>Increase</button>
      </div>
    </div>
  );
}

export default Scanner;
