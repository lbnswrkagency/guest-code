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
    timeLimit.setHours(24, 0, 0, 0); // Set time limit to 09 PM

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

      <h1 className="scanner-title">SCANNER</h1>

      <img
        className="scanner-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />

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
          <div className="scanner-reader">
            <video
              ref={videoRef}
              style={{ display: "none" }}
              playsInline
              muted
            ></video>
            <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
          </div>
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
              <h2>USED</h2> <p>{scanResult.paxChecked}</p>
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

            {scanResult.typeOfTicket === "Table-Code" ? (
              <>
                <div className={`scanner-result-data-value friends-code-color`}>
                  <h2>TABLE</h2> <p>{scanResult.tableNumber}</p>
                </div>
                <div className={`scanner-result-data-value friends-code-color`}>
                  <h2>BACKSTAGE PASS</h2>{" "}
                  <p>{scanResult.backstagePass ? "Yes" : "No"}</p>
                </div>
              </>
            ) : (
              <div
                className={`scanner-result-data-value condition ${
                  scanResult.typeOfTicket === "Guest-Code"
                    ? "guest-code-color"
                    : "friends-code-color"
                }`}
              >
                <h2>CONDITION</h2> <p>{scanResult.condition}</p>
              </div>
            )}
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
            <div className="scanner-options-value">
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
        </div>
      )}
    </div>
  );
}

export default Scanner;
