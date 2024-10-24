import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./Scanner.scss";
import jsQR from "jsqr";
import Navigation from "../Navigation/Navigation";

function Scanner({ onClose }) {
  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState("");
  const [scanning, setScanning] = useState(true);
  const [scannerError, setScannerError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Function to initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        startScanning();
      }
    } catch (err) {
      console.error("Camera initialization error:", err);
      setScannerError(true);
      toast.error(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  // Function to handle QR code scanning
  const startScanning = () => {
    const tick = () => {
      if (
        videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA &&
        !isProcessing
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

        if (code && !isProcessing) {
          handleQRCode(code.data);
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  // Function to handle QR code data
  const handleQRCode = async (data) => {
    setIsProcessing(true);
    if (!data || data.trim() === "") {
      toast.error("Invalid QR code content", {
        toastId: "invalid-qr",
      });
      setIsProcessing(false);
      return;
    }

    try {
      await validateTicket(data);
    } catch (error) {
      console.error("QR processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  // Clean up function
  const cleanupCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    if (scanning && !scanResult) {
      initializeCamera();
    }

    return () => cleanupCamera();
  }, [scanning, scanResult]);

  const validateTicket = async (ticketId) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/qr/validate`,
        { ticketId }
      );
      setScanResult(response.data);
      setScanning(false);
      cleanupCamera();
    } catch (error) {
      // More user-friendly error messages based on error type
      const errorMessage =
        error.response?.status === 404
          ? "Invalid ticket code"
          : error.response?.status === 400
          ? "Invalid QR code format"
          : error.response?.data?.message || "Error validating ticket";

      // Use toastId to prevent duplicate toasts
      toast.error(errorMessage, {
        toastId: "validation-error",
        autoClose: 2000,
      });

      setIsProcessing(false);
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
        toastId: "pax-update", // Prevent duplicate toasts
      });
    } catch (error) {
      toast.error(`Error ${increment ? "increasing" : "decreasing"} pax`, {
        toastId: "pax-error", // Prevent duplicate toasts
      });
    }
  };

  const handleManualSubmit = () => {
    if (manualId) {
      validateTicket(manualId);
      setManualId("");
    } else {
      toast.error("Please enter a code ID", {
        toastId: "manual-input-error", // Prevent duplicate toasts
      });
    }
  };

  const resetScanner = () => {
    cleanupCamera();
    setScanResult(null);
    setScanning(true);
    setIsProcessing(false);
    setScannerError(false);
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
