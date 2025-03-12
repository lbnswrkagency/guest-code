import React, { useEffect, useRef, useState } from "react";
import Navigation from "../Navigation/Navigation";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./Scanner.scss";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiQrScanLine,
  RiCloseLine,
  RiCheckLine,
  RiUserLine,
  RiTimeLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiErrorWarningLine,
} from "react-icons/ri";

function Scanner({ onClose }) {
  const [scanResult, setScanResult] = useState(null);
  const [manualId, setManualId] = useState("");
  const [scanning, setScanning] = useState(true);
  const [scannerError, setScannerError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
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
    if (errorMessage) {
      return; // Don't start scanning if there's an error
    }

    const tick = () => {
      if (
        videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA &&
        !isProcessing &&
        !errorMessage // Don't scan if there's an error
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

        if (code && !isProcessing && !errorMessage) {
          handleQRCode(code.data);
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  };

  // Function to handle QR code data
  const handleQRCode = async (data) => {
    if (isProcessing || errorMessage) {
      return; // Don't process if already processing or if there's an error
    }

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
      let codeToValidate = data;

      try {
        codeData = JSON.parse(data);
        console.log("Parsed QR code JSON data:", codeData);

        // Check if we have a code property in the parsed object
        if (codeData && codeData.code) {
          codeToValidate = codeData.code;
        } else if (codeData && codeData.securityToken) {
          codeToValidate = codeData.securityToken;
        }
      } catch (parseError) {
        // If not JSON, treat as a raw code
        console.log("QR code is not JSON, treating as raw code");
      }

      // Validate the code
      await validateTicket(codeToValidate);
    } catch (error) {
      console.error("QR processing error:", error);
      setErrorMessage("Failed to process QR code. Please try again.");
      cleanupCamera(); // Stop the camera when there's an error
      setShowCamera(false);
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
    if (scanning && !scanResult && showCamera && !errorMessage) {
      initializeCamera();
    }

    return () => cleanupCamera();
  }, [scanning, scanResult, showCamera, errorMessage]);

  const validateTicket = async (codeValue) => {
    try {
      setIsProcessing(true);
      console.log("Validating code:", codeValue);

      // Single API call to validate the code - will handle security tokens, IDs, and code values
      const response = await axiosInstance.post("/qr/validate", {
        ticketId: codeValue,
      });

      console.log("Verification response:", response.data);

      // Map the response data to our scanResult structure
      const ticketData = response.data;

      // Determine the appropriate name to display based on ticket type
      let displayName = "Guest";

      if (ticketData.typeOfTicket === "Ticket-Code" && ticketData.ticketName) {
        // For tickets, use the ticket name
        displayName = ticketData.ticketName;
      } else if (ticketData.guestName) {
        // For guest codes, use the guest name
        displayName = ticketData.guestName;
      } else if (ticketData.name && ticketData.name !== "Guest Code") {
        // For other codes with a meaningful name
        displayName = ticketData.name;
      }

      const formattedResult = {
        _id: ticketData._id,
        code: ticketData.code || ticketData.securityToken || codeValue,
        typeOfTicket: ticketData.typeOfTicket || "Unknown Code",
        name: displayName,
        pax: ticketData.pax || ticketData.maxPax || 1,
        paxChecked: ticketData.paxChecked || 0,
        condition: ticketData.condition || "",
        tableNumber: ticketData.tableNumber || "",
        status: ticketData.status,
        ticketType: ticketData.ticketType || "",
        eventDetails: ticketData.eventDetails || {
          title: ticketData.eventName || "Unknown Event",
        },
        metadata: {
          ...(ticketData.metadata || {}),
          hostName:
            ticketData.hostName ||
            (ticketData.metadata && ticketData.metadata.hostName) ||
            "",
        },
      };

      console.log("Formatted result:", formattedResult);
      setScanResult(formattedResult);
      setScanning(false);
      setShowCamera(false);
      setErrorMessage(null);
      cleanupCamera();

      toast.showSuccess("Code verified successfully");
    } catch (error) {
      console.error("Validation error:", error);

      // More user-friendly error messages based on error type
      const errorMessage =
        error.response?.status === 404
          ? "Invalid code or code not found"
          : error.response?.status === 401
          ? "Authentication required. Please log in again."
          : error.response?.status === 400
          ? error.response?.data?.message || "Invalid QR code format"
          : error.response?.data?.message || "Error validating code";

      toast.showError(errorMessage);
      setErrorMessage(errorMessage);
      cleanupCamera();
      setShowCamera(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePax = async (increment) => {
    try {
      console.log(
        `Updating pax, increment: ${increment}, codeId: ${scanResult._id}`
      );

      // Use the QR routes for increasing/decreasing pax
      const endpoint = increment
        ? `/qr/increase/${scanResult._id}`
        : `/qr/decrease/${scanResult._id}`;

      const response = await axiosInstance.put(endpoint);

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
    setShowCamera(false);
    setErrorMessage(null);
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

  const handleStartScan = () => {
    setShowCamera(true);
    setScanning(true);
    setErrorMessage(null);
  };

  return (
    <div className="scanner-container">
      <Navigation onBack={onClose} />

      <div className="scanner-content">
        <AnimatePresence mode="wait">
          {!scanResult && !showCamera && !errorMessage && (
            <motion.div
              className="scanner-home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="scanner-title">
                <h1>Guest Scanner</h1>
                <p>Scan QR codes or enter code manually</p>
              </div>

              <div className="scanner-actions">
                <motion.button
                  className="scan-button"
                  onClick={handleStartScan}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiQrScanLine />
                  <span>Scan QR Code</span>
                </motion.button>

                <div className="manual-input">
                  <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="Enter code manually"
                  />
                  <motion.button
                    onClick={handleManualSubmit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Verify
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              className="error-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="error-icon">
                <RiErrorWarningLine />
              </div>
              <h2>Verification Failed</h2>
              <p>{errorMessage}</p>
              <motion.button
                className="try-again-btn"
                onClick={resetScanner}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}

          {showCamera && !errorMessage && (
            <motion.div
              className="scanner-camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="camera-container">
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
                    <div className="scan-overlay">
                      <div className="scan-frame"></div>
                      <p>Position QR code within the frame</p>
                    </div>
                  </>
                ) : (
                  <div className="scanner-error">
                    <p>Camera access error. Please check permissions.</p>
                  </div>
                )}
              </div>

              <motion.button
                className="cancel-scan"
                onClick={() => {
                  cleanupCamera();
                  setShowCamera(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiCloseLine />
                <span>Cancel</span>
              </motion.button>
            </motion.div>
          )}

          {scanResult && (
            <motion.div
              className="scan-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`result-header ${getCodeColorClass()}`}>
                <h2>{scanResult.typeOfTicket}</h2>
                <div className="result-event">
                  {scanResult.eventDetails?.title && (
                    <p>{scanResult.eventDetails.title}</p>
                  )}
                </div>
              </div>

              <div className="result-details">
                <div className="detail-item">
                  <RiUserLine />
                  <div>
                    <label>Name</label>
                    <p>{scanResult.name}</p>
                  </div>
                </div>

                {scanResult.typeOfTicket?.toLowerCase().includes("ticket") && (
                  <div className="detail-item">
                    <RiTimeLine />
                    <div>
                      <label>Ticket Type</label>
                      <p>{scanResult.ticketType || "Standard"}</p>
                    </div>
                  </div>
                )}

                {scanResult.typeOfTicket?.toLowerCase().includes("table") && (
                  <div className="detail-item">
                    <RiTimeLine />
                    <div>
                      <label>Table</label>
                      <p>{scanResult.tableNumber || "N/A"}</p>
                    </div>
                  </div>
                )}

                {scanResult.condition && (
                  <div className="detail-item">
                    <RiTimeLine />
                    <div>
                      <label>Condition</label>
                      <p>{scanResult.condition}</p>
                    </div>
                  </div>
                )}

                {scanResult.metadata?.hostName && (
                  <div className="detail-item">
                    <RiUserLine />
                    <div>
                      <label>Created By</label>
                      <p>{scanResult.metadata.hostName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="counter-section">
                <div className="counter-label">
                  <span>People</span>
                  <div className="counter-info">
                    <span className="current">{scanResult.paxChecked}</span>
                    <span className="divider">/</span>
                    <span className="max">{scanResult.pax}</span>
                  </div>
                </div>

                <div className="counter-controls">
                  <motion.button
                    className="counter-btn decrease"
                    onClick={() => updatePax(false)}
                    disabled={scanResult.paxChecked <= 0}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiArrowLeftLine />
                  </motion.button>

                  <motion.button
                    className="counter-btn increase"
                    onClick={() => updatePax(true)}
                    disabled={scanResult.paxChecked >= scanResult.pax}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiArrowRightLine />
                  </motion.button>
                </div>
              </div>

              <motion.button
                className="scan-again-btn"
                onClick={resetScanner}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiQrScanLine />
                <span>Scan Again</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {isProcessing && (
          <div className="processing-overlay">
            <div className="loader"></div>
            <p>Processing...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scanner;
