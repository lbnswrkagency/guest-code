import React, { useEffect, useRef, useState } from "react";

import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./Scanner.scss";
import jsQR from "jsqr";
import Navigation from "../Navigation/Navigation";

function Scanner({ onClose }) {
  let isScanning = true;

  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState("");
  const [scanning, setScanning] = useState(true);
  const [scannerError, setScannerError] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isTicketValidated, setIsTicketValidated] = useState(false);

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

  const processVideo = (videoElement) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);

    if (code) {
      validateTicket(code.data);
    }
  };

  const stopVideoStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const checkTimeLimit = () => {
    const now = new Date();
    const timeLimit = new Date();
    timeLimit.setHours(24, 0, 0, 0); // Set time limit to 23:00 H

    return now > timeLimit;
  };

  const validateTicket = async (ticketId) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/qr/validate`,
        { ticketId }
      );
      setScanResult(response.data);
      setIsTicketValidated(true); // Set the flag to true on successful validation
      stopVideoStream(); // Stop the video stream
      setScanning(false); // Update the scanning state
    } catch (error) {
      // Handle the error case as needed
      if (!toastShown) {
        toast.error("Error validating ticket", { autoClose: 2000 });
        setToastShown(true);
        setTimeout(() => setToastShown(false), 2000); // Reset the toast shown state
      }
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
      toast.success(`Checked ${increment ? "in" : "out"} successfully`, {
        autoClose: 2000,
      });
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

    const tick = () => {
      if (
        isMounted &&
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const canvasElement = canvasRef.current;
        const context = canvasElement.getContext("2d");
        canvasElement.width = videoRef.current.videoWidth;
        canvasElement.height = videoRef.current.videoHeight;
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        const imageData = context.getImageData(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          validateTicket(code.data);
        }
      }
      requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        if (isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          tick();
        }
      })
      .catch(function (err) {
        if (isMounted) {
          console.error(err);
          setScannerError(true);
        }
      });

    return () => {
      isMounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [scanning, scannerError]); // Dependencies array

  const resetScanner = () => {
    setScanning(true);
    setScanResult(null);
    setToastShown(false);
  };

  return (
    <div className="scanner">
      <ToastContainer />
      <Navigation onBack={onClose} />

      <div className="scanner-header">
        <h1 className="scanner-header-title">Scanner</h1>
        <img
          className="scanner-header-logo"
          src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
          alt="Logo"
        />
      </div>

      <div className="scanner-content">
        {scanning && !scanResult && (
          <>
            <div className="scanner-reader-container">
              {!scannerError ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </>
              ) : (
                <div className="scanner-error">
                  <p>Scanner error. Please ensure your device has a webcam.</p>
                </div>
              )}
            </div>

            <div className="scanner-manual">
              <input
                className="scanner-manual-input"
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Plan B: Enter Code ID"
              />
              <button
                className="scanner-manual-submit"
                onClick={handleManualSubmit}
              >
                Validate
              </button>
            </div>
          </>
        )}

        {scanResult && (
          <div className="scanner-result">
            <div className="scanner-result-data">
              <div
                className={`scanner-result-data-item ${
                  scanResult.typeOfTicket === "Guest-Code"
                    ? "guest-code"
                    : "friends-code"
                }`}
              >
                <h2>Type</h2>
                <p>{scanResult.typeOfTicket}</p>
              </div>

              <div
                className={`scanner-result-data-item ${
                  scanResult.typeOfTicket === "Guest-Code"
                    ? "guest-code"
                    : "friends-code"
                }`}
              >
                <h2>Name</h2>
                <p>{scanResult.name}</p>
              </div>

              <div
                className={`scanner-result-data-item ${
                  scanResult.typeOfTicket === "Guest-Code"
                    ? "guest-code"
                    : "friends-code"
                }`}
              >
                <h2>Used</h2>
                <p>{scanResult.paxChecked}</p>
              </div>

              <div
                className={`scanner-result-data-item ${
                  scanResult.typeOfTicket === "Guest-Code"
                    ? "guest-code"
                    : "friends-code"
                }`}
              >
                <h2>Allowed</h2>
                <p>{scanResult.pax}</p>
              </div>

              {scanResult.typeOfTicket === "Table-Code" ? (
                <>
                  <div className="scanner-result-data-item friends-code">
                    <h2>Table</h2>
                    <p>{scanResult.tableNumber}</p>
                  </div>
                  <div className="scanner-result-data-item friends-code">
                    <h2>Backstage Pass</h2>
                    <p>{scanResult.backstagePass ? "Yes" : "No"}</p>
                  </div>
                </>
              ) : (
                <div
                  className={`scanner-result-data-item condition ${
                    scanResult.typeOfTicket === "Guest-Code"
                      ? "guest-code"
                      : "friends-code"
                  }`}
                >
                  <h2>Condition</h2>
                  <p>{scanResult.condition}</p>
                </div>
              )}
            </div>

            <div className="scanner-result-controls">
              <div className="scanner-result-controls-counter">
                <button
                  onClick={() => updatePax(false)}
                  disabled={scanResult.paxChecked <= 0}
                >
                  -
                </button>
                <div className="scanner-result-controls-counter-value">
                  <p>People</p>
                  <span>{scanResult.paxChecked}</span>
                </div>
                <button
                  onClick={() => updatePax(true)}
                  disabled={scanResult.paxChecked >= scanResult.pax}
                >
                  +
                </button>
              </div>

              <button
                className="scanner-result-controls-scan"
                onClick={resetScanner}
              >
                Scan Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scanner;
