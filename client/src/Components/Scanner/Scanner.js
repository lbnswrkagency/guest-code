import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./Scanner.scss";

function Scanner({ onClose }) {
  let isScanning = true;

  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState("");
  const [scanning, setScanning] = useState(true);
  const [timeLimitPassed, setTimeLimitPassed] = useState(false);
  const [scannerError, setScannerError] = useState(false);
  const [toastShown, setToastShown] = useState(false);

  const handleScan = (decodedText, decodedResult) => {
    if (isScanning) {
      isScanning = false; // Prevents multiple scans
      qrCodeScanner.pause(); // Immediately pause scanner
      validateTicket(decodedText).finally(() => {
        isScanning = true; // Reset for next scan
        qrCodeScanner.resume(); // Resume scanner after processing
      });
    }
  };

  let qrCodeScanner;

  const handleError = (err) => {
    console.error(err);
    if (!isScanning) return; // Prevents multiple error toasts
    isScanning = false; // Set to false to prevent further scans

    // Example: Check for specific error types before setting scannerError
    if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
      setScannerError(true);
      toast.error("Scanning error. Please ensure your device has a webcam.");
      if (qrCodeScanner) {
        qrCodeScanner.clear();
      }
    } else {
      // Handle non-critical errors differently
      console.log("Non-critical error: ", err.message);
    }

    setTimeout(() => (isScanning = true), 2000); // Reset flag after a delay
  };

  const checkTimeLimit = () => {
    const now = new Date();
    const timeLimit = new Date();
    timeLimit.setHours(22, 0, 0, 0); // Set time limit to 10 PM

    return now > timeLimit;
  };

  const validateTicket = async (ticketId) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/qr/validate`,
        { ticketId }
      );
      setScanResult(response.data);

      if (checkTimeLimit()) {
        setTimeLimitPassed(true);
      }

      setScanning(false);
      if (!toastShown) {
        toast.success("Ticket validated successfully", { autoClose: 2000 });
        setToastShown(true);
      }
    } catch (error) {
      qrCodeScanner.pause(); // Pause scanner on error
      if (!toastShown) {
        toast.error("Error validating ticket", { autoClose: 2000 });
        setToastShown(true); // Update state to indicate toast has been shown
      }
    } finally {
      qrCodeScanner.resume(); // Resume scanner after validation
      setToastShown(false);
    }
  };

  const updatePax = async (increment) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/qr/${
          increment ? "increase" : "decrease"
        }/${scanResult._id}`
      );
      setScanResult({ ...scanResult, paxChecked: response.data.paxChecked });
      toast.success(
        `Pax ${increment ? "increased" : "decreased"} successfully`,
        {
          autoClose: 2000,
        }
      );
    } catch (error) {
      toast.error(`Error ${increment ? "increasing" : "decreasing"} pax`);
    }
  };

  const handleManualSubmit = () => {
    if (manualId) {
      validateTicket(manualId);
      setManualId("");
      setToastShown(false);
    }
  };

  useEffect(() => {
    let isMounted = true; // To check if the component is still mounted

    const startScanner = () => {
      qrCodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );

      qrCodeScanner.render(handleScan, (err) => {
        if (isMounted) {
          handleError(err);
        }
      });
    };

    if (scanning && !scannerError) {
      startScanner();
    }

    return () => {
      isMounted = false;
      if (qrCodeScanner) {
        qrCodeScanner.clear();
      }
    };
  }, [scanning, scannerError]);

  const resetScanner = () => {
    setScanning(true);
    setScanResult(null);
    setToastShown(false);
  };

  return (
    <div className="scanner">
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <img
        className="scanner-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />
      <ToastContainer />

      <div
        id="qr-reader-container"
        style={{
          width: "500px",
          display: scanning && !scanResult ? "grid" : "none",
        }}
      >
        {scannerError ? (
          <div className="scanner-error">
            <p>Scanner error. Please ensure your device has a webcam.</p>
          </div>
        ) : (
          <div id="qr-reader"></div>
        )}

        <input
          className="scanner-manual"
          type="text"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="PLAN-B: TYPE IN ID"
        />
        <button className="scanner-manuel-submit" onClick={handleManualSubmit}>
          SUBMIT ID
        </button>
      </div>

      {scanResult && (
        <div className="scanner-result">
          <div className="scanner-result-data">
            <div
              className={`scanner-result-data-value ${
                scanResult.typeOfTicket === "Guest-Code"
                  ? "guest-code-color"
                  : "friends-code-color"
              }`}
            >
              <h2>TYPE</h2> <p>{scanResult.typeOfTicket}</p>
            </div>
            <div
              className={`scanner-result-data-value ${
                scanResult.typeOfTicket === "Guest-Code"
                  ? "guest-code-color"
                  : "friends-code-color"
              }`}
            >
              <h2>NAME</h2> <p>{scanResult.name}</p>
            </div>
            <div
              className={`scanner-result-data-value ${
                scanResult.typeOfTicket === "Guest-Code"
                  ? "guest-code-color"
                  : "friends-code-color"
              }`}
            >
              <h2>ALLOWED</h2> <p>{scanResult.pax}</p>
            </div>
            <div
              className={`scanner-result-data-value ${
                scanResult.typeOfTicket === "Guest-Code"
                  ? "guest-code-color"
                  : "friends-code-color"
              }`}
            >
              <h2>USED</h2> <p>{scanResult.paxChecked}</p>
            </div>
            <div
              className={`scanner-result-data-value ${
                scanResult.typeOfTicket === "Guest-Code"
                  ? "guest-code-color"
                  : "friends-code-color"
              }`}
            >
              <h2>CONDITION</h2> <p>{scanResult.condition}</p>
              {timeLimitPassed && (
                <div className="scanner-result-data-value-limit">
                  <p>TIME PASSED</p>
                  <p>If you want to be nice, you can still check it in.</p>
                </div>
              )}
            </div>
          </div>
          <button className="scanner-open" onClick={resetScanner}>
            SCAN GAIN
          </button>
          <div className="scanner-options">
            <button
              onClick={() => updatePax(false)}
              disabled={scanResult.paxChecked <= 0}
            >
              -
            </button>

            <span>{scanResult.paxChecked}</span>

            <button
              onClick={() => updatePax(true)}
              disabled={scanResult.paxChecked >= scanResult.pax}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scanner;
