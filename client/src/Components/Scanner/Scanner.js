import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Navigation from "../Navigation/Navigation";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./Scanner.scss";
import jsQR from "jsqr";

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
  const toast = useToast();

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
      toast.showError(
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
      toast.showError("Invalid QR code content");
      setIsProcessing(false);
      return;
    }

    try {
      console.log("QR code data:", data);

      // Check if the data is JSON
      let codeData;
      try {
        codeData = JSON.parse(data);
        console.log("Parsed QR code JSON data:", codeData);

        // Check if we have a code property in the parsed object
        if (codeData && codeData.code) {
          await validateTicket(codeData.code);
        } else {
          // Try using the raw data as a fallback
          await validateTicket(data);
        }
      } catch (parseError) {
        // If not JSON, treat as a raw code
        console.log("QR code is not JSON, treating as raw code");
        await validateTicket(data);
      }
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

  const validateTicket = async (codeValue) => {
    try {
      console.log("Validating code:", codeValue);

      // Try using the new endpoint structure first
      const response = await axiosInstance.post("/codes/verify", {
        code: codeValue,
      });

      console.log("Verification response:", response.data);

      // Map the response data to our scanResult structure
      const codeData = response.data.code;
      const eventData = response.data.event;
      const codeSettingData = response.data.codeSetting;

      const formattedResult = {
        _id: codeData._id,
        code: codeData.code,
        typeOfTicket:
          codeData.type.charAt(0).toUpperCase() +
          codeData.type.slice(1) +
          " Code",
        name: codeData.name || codeSettingData?.name || "Guest",
        pax: codeData.maxPax || 1,
        paxChecked: codeData.paxChecked || 0,
        condition: codeData.condition || "",
        tableNumber: codeData.tableNumber || "",
        status: codeData.status,
        eventDetails: {
          _id: eventData?._id,
          title: eventData?.title,
          date: eventData?.date,
          location: eventData?.location,
        },
        metadata: codeData.metadata || {},
      };

      console.log("Formatted result:", formattedResult);
      setScanResult(formattedResult);
      setScanning(false);
      cleanupCamera();

      toast.showSuccess("Code verified successfully");
    } catch (error) {
      console.error("Validation error:", error);

      // More user-friendly error messages based on error type
      const errorMessage =
        error.response?.status === 404
          ? "Invalid code"
          : error.response?.status === 400
          ? error.response?.data?.message || "Invalid QR code format"
          : error.response?.data?.message || "Error validating code";

      toast.showError(errorMessage);
      setIsProcessing(false);
    }
  };

  const updatePax = async (increment) => {
    try {
      console.log(
        `Updating pax, increment: ${increment}, codeId: ${scanResult._id}`
      );

      // Use the new endpoint structure
      const response = await axiosInstance.post(
        `/codes/${scanResult._id}/usage`,
        {
          paxUsed: increment ? 1 : -1,
          location: "Scanner App",
          deviceInfo: navigator.userAgent,
        }
      );

      console.log("Update pax response:", response.data);

      setScanResult({
        ...scanResult,
        paxChecked: increment
          ? Math.min(scanResult.paxChecked + 1, scanResult.pax)
          : Math.max(scanResult.paxChecked - 1, 0),
      });

      toast.showSuccess(`Checked ${increment ? "in" : "out"} successfully`);
    } catch (error) {
      console.error("Pax update error:", error);

      const errorMessage =
        error.response?.data?.message ||
        `Error ${increment ? "increasing" : "decreasing"} pax`;

      toast.showError(errorMessage);
    }
  };

  const handleManualSubmit = () => {
    if (manualId) {
      validateTicket(manualId);
      setManualId("");
    } else {
      toast.showError("Please enter a code ID");
    }
  };

  const resetScanner = () => {
    cleanupCamera();
    setScanResult(null);
    setScanning(true);
    setIsProcessing(false);
    setScannerError(false);
  };

  // Helper function to determine code color class
  const getCodeColorClass = () => {
    if (!scanResult) return "";

    const type = scanResult.typeOfTicket?.toLowerCase() || "";

    if (type.includes("guest")) return "guest-code";
    if (type.includes("friends")) return "friends-code";
    if (type.includes("backstage")) return "backstage-code";
    if (type.includes("table")) return "table-code";
    if (type.includes("ticket")) return "ticket-code";

    return "custom-code"; // Default for custom types
  };

  return (
    <div className="scanner">
      <Navigation onBack={onClose} />

      <div className="scanner-header">
        <h1 className="scanner-header-title">Scanner</h1>
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
                className={`scanner-result-data-item ${getCodeColorClass()}`}
              >
                <h2>Type</h2>
                <p>{scanResult.typeOfTicket}</p>
              </div>

              <div
                className={`scanner-result-data-item ${getCodeColorClass()}`}
              >
                <h2>Name</h2>
                <p>{scanResult.name}</p>
              </div>

              <div
                className={`scanner-result-data-item ${getCodeColorClass()}`}
              >
                <h2>Used</h2>
                <p>{scanResult.paxChecked}</p>
              </div>

              <div
                className={`scanner-result-data-item ${getCodeColorClass()}`}
              >
                <h2>Allowed</h2>
                <p>{scanResult.pax}</p>
              </div>

              {scanResult.typeOfTicket?.toLowerCase().includes("table") ? (
                <>
                  <div
                    className={`scanner-result-data-item ${getCodeColorClass()}`}
                  >
                    <h2>Table</h2>
                    <p>{scanResult.tableNumber || "N/A"}</p>
                  </div>
                </>
              ) : (
                <div
                  className={`scanner-result-data-item condition ${getCodeColorClass()}`}
                >
                  <h2>Condition</h2>
                  <p>{scanResult.condition || "None"}</p>
                </div>
              )}

              {/* Display any additional metadata if available */}
              {scanResult.metadata && scanResult.metadata.hostName && (
                <div
                  className={`scanner-result-data-item ${getCodeColorClass()}`}
                >
                  <h2>Created By</h2>
                  <p>{scanResult.metadata.hostName}</p>
                </div>
              )}

              {/* Display the event name if available */}
              {scanResult.eventDetails && scanResult.eventDetails.title && (
                <div
                  className={`scanner-result-data-item ${getCodeColorClass()}`}
                >
                  <h2>Event</h2>
                  <p>{scanResult.eventDetails.title}</p>
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
