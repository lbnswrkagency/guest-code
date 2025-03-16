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
  RiInformationLine,
  RiCalendarEventLine,
} from "react-icons/ri";

// Add this debug flag to help with troubleshooting
const DEBUG_SCANNING = false; // Set to true to enable extended logging

function Scanner({ onClose, selectedEvent, selectedBrand, user }) {
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
  const lastScannedCode = useRef(null); // Store the last scanned code to prevent duplicates
  const lastScanTime = useRef(0); // Store the last scan time for debouncing
  const lastProcessedFrame = useRef(0); // To control frame processing rate
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
        // Process frames at a reasonable rate to avoid overloading
        const now = Date.now();
        const shouldProcessFrame = now - lastProcessedFrame.current > 100; // Process ~10 frames per second

        if (!shouldProcessFrame) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        lastProcessedFrame.current = now;

        const canvasElement = canvasRef.current;
        const context = canvasElement.getContext("2d");
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        canvasElement.width = videoWidth;
        canvasElement.height = videoHeight;

        // Draw video frame to canvas
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // Get image data
        const imageData = context.getImageData(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        // Try standard QR code detection
        let code = jsQR(imageData.data, imageData.width, imageData.height);

        // If primary detection failed, try alternative approaches
        if (!code) {
          // Try with inverted colors (some older QR codes might need this)
          if (DEBUG_SCANNING)
            console.log("Primary scan failed, trying alternatives...");

          // Invert the image data to try detecting inverted QR codes
          const invertedData = new Uint8ClampedArray(imageData.data);
          for (let i = 0; i < invertedData.length; i += 4) {
            invertedData[i] = 255 - invertedData[i]; // R
            invertedData[i + 1] = 255 - invertedData[i + 1]; // G
            invertedData[i + 2] = 255 - invertedData[i + 2]; // B
          }

          const invertedImageData = new ImageData(
            invertedData,
            imageData.width,
            imageData.height
          );

          // Try to detect QR code in the inverted image
          code = jsQR(
            invertedImageData.data,
            imageData.width,
            imageData.height
          );
        }

        if (code && !isProcessing && !errorMessage) {
          if (DEBUG_SCANNING) console.log("QR code detected:", code.data);

          // Prevent processing the same code multiple times in succession
          if (
            code.data !== lastScannedCode.current ||
            Date.now() - lastScanTime.current > 5000 // Allow rescanning after 5 seconds
          ) {
            handleQRCode(code.data);
          }
        } else if (DEBUG_SCANNING && !code) {
          console.log("No QR code detected in this frame");
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

    // Update the last scanned code and time
    lastScannedCode.current = data;
    lastScanTime.current = Date.now();

    setIsProcessing(true);
    if (!data || data.trim() === "") {
      toast.showError("Invalid QR code content");
      setIsProcessing(false);
      return;
    }

    try {
      let codeType = "Raw Code";
      let codeToValidate = data; // Initialize at the function scope level

      // Short code format check (for codes like VCUDRT8T)
      if (/^[A-Z0-9]{8}$/.test(data)) {
        codeType = "Short Code";
        // No need to modify data, codeToValidate already set to data
      } else {
        // Check if the data is JSON
        let codeData;

        try {
          codeData = JSON.parse(data);
          codeType = "JSON Code";

          // Check if we have a code property in the parsed object
          if (codeData && codeData.code) {
            codeToValidate = codeData.code;
            codeType = "JSON Code (code property)";
          } else if (codeData && codeData.securityToken) {
            codeToValidate = codeData.securityToken;
            codeType = "JSON Code (securityToken property)";
          }
        } catch (parseError) {
          // If not JSON, try to extract from URL format

          // Enhanced URL parsing
          if (data.includes("/validate/") || data.includes("guest-code.com")) {
            // Enhanced URL parsing to handle various formats
            try {
              // First check if it's a full URL
              let urlToProcess = data;

              // For URLs, extract just the path part
              if (data.includes("http")) {
                const url = new URL(data);
                urlToProcess = url.pathname;
              }

              // Extract the security token (last part after /)
              const urlParts = urlToProcess
                .split("/")
                .filter((part) => part.trim());
              if (urlParts.length > 0) {
                const securityToken = urlParts[urlParts.length - 1];

                // Validate that it looks like a security token (alphanumeric, reasonable length)
                if (securityToken && securityToken.length >= 8) {
                  codeToValidate = securityToken;
                  codeType = "URL Code";
                }
              }
            } catch (urlError) {
              // Fall back to the original method
              const urlParts = data.split("/");
              if (urlParts.length >= 2) {
                const securityToken = urlParts[urlParts.length - 1];
                codeToValidate = securityToken;
                codeType = "URL Code";
              }
            }
          } else if (data.match(/^[a-zA-Z0-9]{32}$/)) {
            // Direct security token format (32 characters alphanumeric)
            codeToValidate = data;
            codeType = "Direct Token";
          }
        }
      }

      // Cancel the animation frame while validating to prevent multiple scans
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Validate the code
      await validateTicket(codeToValidate);
    } catch (error) {
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

      // Add the eventId to the validation request if available
      const payload = {
        ticketId: codeValue,
      };

      // Add event information to the payload if available
      if (selectedEvent && selectedEvent._id) {
        payload.eventId = selectedEvent._id;
      }

      // Add brand information if available and no event
      if (!payload.eventId && selectedBrand && selectedBrand._id) {
        payload.brandId = selectedBrand._id;
      }

      try {
        // Single API call to validate the code - will handle security tokens, IDs, and code values
        const response = await axiosInstance.post("/qr/validate", payload);

        // If the ticket doesn't belong to the selected event, show an error
        if (
          selectedEvent &&
          response.data.eventId &&
          selectedEvent._id !== response.data.eventId &&
          response.data.eventDetails?.title !== selectedEvent.title
        ) {
          // Handle wrong event error with a simpler UI message
          setErrorMessage("That code is from a different event.");
          setShowCamera(false);
          cleanupCamera();
          setIsProcessing(false);
          return; // Exit early to prevent multiple error messages
        }

        // Map the response data to our scanResult structure
        const ticketData = response.data;

        // Determine the appropriate name to display based on ticket type
        let displayName = "Guest";

        if (
          ticketData.typeOfTicket === "Ticket-Code" &&
          ticketData.ticketName
        ) {
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
          type: ticketData.type,
          name: displayName,
          pax: ticketData.pax || ticketData.maxPax || 1,
          paxChecked: ticketData.paxChecked || 0,
          condition: ticketData.condition || "",
          tableNumber: ticketData.tableNumber || "",
          status: ticketData.status,
          ticketType: ticketData.ticketType || "",
          codeColor: ticketData.codeColor,
          eventDetails: ticketData.eventDetails || {
            title:
              ticketData.eventName || selectedEvent?.title || "Unknown Event",
          },
          metadata: {
            ...(ticketData.metadata || {}),
            hostName:
              ticketData.hostName ||
              (ticketData.metadata && ticketData.metadata.hostName) ||
              "",
          },
        };

        setScanResult(formattedResult);
        setScanning(false);
        setShowCamera(false);
        setErrorMessage(null);
        cleanupCamera();

        // Single toast for successful validation - simplified
        toast.showSuccess("Verified");
      } catch (error) {
        // More user-friendly error messages based on error type
        let errorMessage = "";

        if (error.response?.status === 404) {
          errorMessage = `Invalid code or code not found: "${codeValue}"`;
        } else if (error.response?.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (error.response?.status === 400) {
          // Check if this is a "different event" error
          if (error.response?.data?.message?.includes("different event")) {
            errorMessage = "That code is from a different event.";
          } else {
            errorMessage =
              error.response?.data?.message || "Invalid QR code format";
          }
        } else {
          errorMessage =
            error.response?.data?.message || "Error validating code";
        }

        toast.showError(errorMessage);
        setErrorMessage(errorMessage);
        cleanupCamera();
        setShowCamera(false);
      }
    } catch (error) {
      // This handles any unexpected errors in the outer try block
      setErrorMessage("An unexpected error occurred. Please try again.");
      cleanupCamera();
      setShowCamera(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePax = async (increment) => {
    try {
      // First check if the code is from the new model (Code) or legacy models
      let endpoint = "";
      let payload = {};

      // New approach - check the typeOfTicket to determine how to update
      if (scanResult.typeOfTicket && scanResult.typeOfTicket.includes("Code")) {
        // For the new Code model (includes all types like Guest-Code, Friends-Code, etc.)
        const codeType = scanResult.typeOfTicket.split("-")[0].toLowerCase();

        // Construct the payload with all necessary info
        payload = {
          eventId: scanResult.eventId || selectedEvent?._id,
          increment: increment,
        };

        // The endpoint depends on whether we're dealing with legacy or new code types
        endpoint = `/codes/${scanResult._id}/update-pax`;
      } else {
        // Legacy approach
        endpoint = increment
          ? `/qr/increase/${scanResult._id}`
          : `/qr/decrease/${scanResult._id}`;
      }

      // Make the request with proper payload
      const response = await axiosInstance.put(endpoint, payload);

      // Update local state with new paxChecked value (from response or calculated)
      const updatedPaxChecked =
        response.data.paxChecked !== undefined
          ? response.data.paxChecked
          : increment
          ? Math.min(scanResult.paxChecked + 1, scanResult.pax)
          : Math.max(scanResult.paxChecked - 1, 0);

      setScanResult({
        ...scanResult,
        paxChecked: updatedPaxChecked,
      });

      // Keep one clear toast message for update
      toast.showSuccess(
        `${increment ? "Checked in" : "Checked out"}: ${scanResult.name}`
      );
    } catch (error) {
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

    // Basic type-based class selection
    const type = scanResult.typeOfTicket?.toLowerCase() || "";

    if (type.includes("guest")) return "guest-code";
    if (type.includes("friends")) return "friends-code";
    if (type.includes("backstage")) return "backstage-code";
    if (type.includes("table")) return "table-code";
    if (type.includes("ticket")) return "ticket-code";
    if (type.includes("custom")) return "custom-code";

    // If type doesn't match standard types, check the underlying code type
    // This handles cases where typeOfTicket is a custom name from code settings
    const codeType = scanResult.type?.toLowerCase() || "";
    if (codeType === "guest") return "guest-code";
    if (codeType === "friends") return "friends-code";
    if (codeType === "backstage") return "backstage-code";
    if (codeType === "table") return "table-code";
    if (codeType === "ticket") return "ticket-code";
    if (codeType === "custom") return "custom-code";

    return "custom-code"; // Default for custom types
  };

  // Function to get custom color style if available
  const getCustomColorStyle = () => {
    if (!scanResult) return {};

    // First, check if we have a custom color directly in the response
    const color = scanResult.codeColor;

    // If no direct color, check if it's in the metadata
    const metadataColor = scanResult.metadata && scanResult.metadata.codeColor;

    // Determine the type for color logic - normalize to lowercase for comparison
    const type = (scanResult.typeOfTicket || "").toLowerCase();
    const codeType = (scanResult.type || "").toLowerCase();

    // Determine the appropriate color based on code type
    let colorToUse;

    // For Guest-Code or guest type, explicitly check and set color
    if (type.includes("guest") || codeType === "guest") {
      // Guest codes should get the color from the backend or default to a specific guest color
      colorToUse = color || metadataColor || "#28a745"; // Green default for guest
    }
    // For Backstage codes
    else if (type.includes("backstage") || codeType === "backstage") {
      colorToUse = color || metadataColor || "#6f42c1"; // Purple for backstage
    }
    // For other code types
    else {
      colorToUse =
        color || metadataColor || getDefaultColorForType(type, codeType);
    }

    // Apply the gradient style with the determined color
    return {
      background: `linear-gradient(135deg, ${colorToUse}, ${adjustColorBrightness(
        colorToUse,
        20
      )})`,
    };
  };

  // Helper function to get default color by type
  const getDefaultColorForType = (type, codeType) => {
    if (type.includes("friends") || codeType === "friends") return "#007bff"; // Blue for friends
    if (type.includes("table") || codeType === "table") return "#6610f2"; // Purple for table
    if (type.includes("ticket") || codeType === "ticket") return "#fd7e14"; // Orange for ticket
    if (type.includes("custom") || codeType === "custom") return "#2196F3"; // Blue for custom

    return "#2196F3"; // Default blue if no specific type matches
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hex, percent) => {
    // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    // Adjust brightness
    r = Math.min(255, Math.floor(r * (1 + percent / 100)));
    g = Math.min(255, Math.floor(g * (1 + percent / 100)));
    b = Math.min(255, Math.floor(b * (1 + percent / 100)));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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
                    placeholder="Enter code or security token (e.g., VCUDRT8T)"
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
              <div className="result-header" style={getCustomColorStyle()}>
                <h2>{scanResult.typeOfTicket}</h2>
                <div className="result-event">
                  {scanResult.eventDetails?.title && (
                    <p>{scanResult.eventDetails.title}</p>
                  )}
                  {selectedEvent && !scanResult.eventDetails?.title && (
                    <p>{selectedEvent.title}</p>
                  )}
                </div>
              </div>

              <div className="event-banner">
                {scanResult.metadata?.hostName && (
                  <div className="event-info">
                    <RiUserLine />
                    <div className="info-text">
                      <div className="label">Created By</div>
                      <div className="value">
                        {scanResult.metadata.hostName}
                      </div>
                    </div>
                  </div>
                )}

                {scanResult.eventDetails && scanResult.eventDetails.date && (
                  <div className="event-info">
                    <RiCalendarEventLine />
                    <div className="info-text">
                      <div className="label">Event Date</div>
                      <div className="value">
                        {new Date(
                          scanResult.eventDetails.date
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Always show the condition if it exists */}
                <div className="event-info">
                  <RiInformationLine />
                  <div className="info-text">
                    <div className="label">Condition</div>
                    <div className="value">
                      {scanResult.condition || "Standard Entry"}
                    </div>
                  </div>
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
