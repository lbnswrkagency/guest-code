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
  RiQrCodeFill,
  RiRefreshLine,
} from "react-icons/ri";
import { componentCleanup } from "../../utils/layoutHelpers";
import Tesseract from "tesseract.js";

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

  // State for Member Chip Scanning
  const [showMemberFlow, setShowMemberFlow] = useState(false);
  const [memberNumberInput, setMemberNumberInput] = useState("");
  const [confirmedMemberNumber, setConfirmedMemberNumber] = useState(null);
  const [showMemberRegistrationForm, setShowMemberRegistrationForm] =
    useState(false);
  const [memberRegistrationData, setMemberRegistrationData] = useState({
    firstName: "",
    lastName: "",
  });
  const [scannedMemberData, setScannedMemberData] = useState(null);
  const [isMemberProcessing, setIsMemberProcessing] = useState(false); // Separate processing state for members
  const [memberErrorMessage, setMemberErrorMessage] = useState(null);
  const [showMemberCamera, setShowMemberCamera] = useState(false); // State for member camera view
  const [capturedFrameDataUrl, setCapturedFrameDataUrl] = useState(null); // State to hold captured image data URL
  const [isOcrProcessing, setIsOcrProcessing] = useState(false); // <-- State for OCR loading

  // Placeholder for handleMemberPaxUpdate
  const handleMemberPaxUpdate = async (increment) => {
    if (isMemberProcessing || !scannedMemberData) return;
    setIsMemberProcessing(true);
    setMemberErrorMessage(null);
    console.log(
      "Attempting to update member PAX:",
      scannedMemberData.memberNumber,
      "Increment:",
      increment
    );
    try {
      // API call to PUT /api/members/pax/:memberNumber
      const response = await axiosInstance.put(
        `/api/members/pax/${scannedMemberData.memberNumber}`,
        {
          increment,
          eventId: selectedEvent?._id, // Pass eventId if available
        }
      );
      setScannedMemberData(response.data.member);
      toast.showSuccess(response.data.message);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to update member PAX.";
      toast.showError(msg);
      setMemberErrorMessage(msg);
    }
    setIsMemberProcessing(false);
  };

  // Placeholder for handleRegisterMember
  const handleRegisterMember = async () => {
    if (
      isMemberProcessing ||
      !confirmedMemberNumber ||
      !memberRegistrationData.firstName ||
      !memberRegistrationData.lastName
    )
      return;
    setIsMemberProcessing(true);
    setMemberErrorMessage(null);
    console.log(
      "Attempting to register member:",
      confirmedMemberNumber,
      memberRegistrationData
    );
    try {
      // API call to POST /api/members/register
      const response = await axiosInstance.post("/api/members/register", {
        memberNumber: confirmedMemberNumber,
        firstName: memberRegistrationData.firstName,
        lastName: memberRegistrationData.lastName,
        brandId: selectedBrand?._id, // Pass brandId if available
      });
      setScannedMemberData(response.data.member);
      setShowMemberRegistrationForm(false);
      setConfirmedMemberNumber(null); // Clear confirmed number after registration
      toast.showSuccess(response.data.message);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to register member.";
      toast.showError(msg);
      setMemberErrorMessage(msg);
    }
    setIsMemberProcessing(false);
  };

  // Function to initialize camera
  const initializeCamera = async (forMemberScan = false) => {
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
    setIsMemberProcessing(false);
    setMemberErrorMessage(null);
    setShowMemberCamera(false); // Reset member camera state
    setCapturedFrameDataUrl(null); // Clear captured frame
    setIsOcrProcessing(false); // <-- Reset OCR state
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
          // Prevent processing the same code multiple times in succession
          if (
            code.data !== lastScannedCode.current ||
            Date.now() - lastScanTime.current > 5000 // Allow rescanning after 5 seconds
          ) {
            handleQRCode(code.data);
          }
        } else if (DEBUG_SCANNING && !code) {
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

      console.log("[Scanner] Validating code:", codeValue);
      console.log("[Scanner] Payload:", payload);

      try {
        // Single API call to validate the code - will handle security tokens, IDs, and code values
        const response = await axiosInstance.post("/qr/validate", payload);
        console.log("[Scanner] Validation response:", response.data);

        // Log TableCode validation details
        if (response.data.typeOfTicket === "Table-Code") {
        }

        // If the ticket doesn't belong to the selected event, show an error
        if (
          selectedEvent &&
          response.data.eventId &&
          selectedEvent._id !== response.data.eventId &&
          response.data.eventDetails?.title !== selectedEvent.title
        ) {
          console.log("[Scanner] Event mismatch - expected:", selectedEvent._id, "got:", response.data.eventId);
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
        console.log("[Scanner] Validation error:", error.response?.data || error.message);
        console.log("[Scanner] Error status:", error.response?.status);
        
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
      console.log("[Scanner] Updating pax for:", scanResult.typeOfTicket, "ID:", scanResult._id);
      console.log("[Scanner] scanResult.type:", scanResult.type);
      console.log("[Scanner] Increment:", increment);
      
      // First check if the code is from the new model (Code) or legacy models
      let endpoint = "";
      let payload = {};

      // Check if this is a ticket from ticketModel.js
      const isTicketModel =
        scanResult.typeOfTicket === "Ticket-Code" && !scanResult.type; // Regular tickets don't have a 'type' field

      console.log("[Scanner] isTicketModel:", isTicketModel);
      console.log("[Scanner] typeOfTicket:", scanResult.typeOfTicket);
      console.log("[Scanner] Has type field:", !!scanResult.type);
      console.log("[Scanner] scanResult full object:", scanResult);

      if (isTicketModel) {
        // For tickets from ticketModel.js, use the ticket endpoints
        endpoint = `/qr/tickets/${scanResult._id}/update-pax`;
        payload = {
          eventId: scanResult.eventId || selectedEvent?._id,
          increment: increment,
        };
        console.log("[Scanner] Using ticket endpoint:", endpoint);
      }
      // Check if this is a TableCode
      else if (scanResult.typeOfTicket === "Table-Code") {
        // For Table Codes, use the tablecode endpoints
        endpoint = `/qr/tablecodes/${scanResult._id}/update-pax`;
        payload = {
          eventId: scanResult.eventId || selectedEvent?._id,
          increment: increment,
        };
        console.log("[Scanner] Using table code endpoint:", endpoint);
      }
      // New approach - check the typeOfTicket to determine how to update
      else if (
        scanResult.typeOfTicket &&
        scanResult.typeOfTicket.includes("Code")
      ) {
        // For the new Code model (includes all types like Guest-Code, Friends-Code, etc.)
        const codeType = scanResult.typeOfTicket.split("-")[0].toLowerCase();

        // Construct the payload with all necessary info
        payload = {
          eventId: scanResult.eventId || selectedEvent?._id,
          increment: increment,
        };

        // The endpoint depends on whether we're dealing with legacy or new code types
        endpoint = `/qr/codes/${scanResult._id}/update-pax`;
        console.log("[Scanner] Using codes endpoint:", endpoint);
      } else {
        // Legacy approach
        endpoint = increment
          ? `/qr/increase/${scanResult._id}`
          : `/qr/decrease/${scanResult._id}`;
        console.log("[Scanner] Using legacy endpoint:", endpoint);
      }

      console.log("[Scanner] Final endpoint:", endpoint);
      console.log("[Scanner] Final payload:", payload);
      
      // Make the request with proper payload
      const response = await axiosInstance.put(endpoint, payload);
      console.log("[Scanner] Update response:", response.data);

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
      console.error("Error updating pax:", error);
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
    // Reset member states as well
    setShowMemberFlow(false);
    setMemberNumberInput("");
    setConfirmedMemberNumber(null);
    setShowMemberRegistrationForm(false);
    setMemberRegistrationData({ firstName: "", lastName: "" });
    setScannedMemberData(null);
    setIsMemberProcessing(false);
    setMemberErrorMessage(null);
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

  // Add a new handler for the refresh button
  const handleRefreshScanner = () => {
    resetScanner();
    // Re-initialize the camera
    initializeCamera().then(() => {
      startScanning();
    });
  };

  // Add event listener to close component when Profile is clicked in Navigation
  useEffect(() => {
    const handleCloseFromProfile = (event) => {
      // Use a small timeout to ensure smooth transitions
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 10);
    };

    window.addEventListener(
      "closeComponentFromProfile",
      handleCloseFromProfile
    );

    return () => {
      window.removeEventListener(
        "closeComponentFromProfile",
        handleCloseFromProfile
      );
    };
  }, [onClose]);

  // Add a useEffect for proper cleanup on unmount
  useEffect(() => {
    return () => {
      componentCleanup(cleanupCamera);
    };
  }, []);

  return (
    <div className="scanner-container">
      <Navigation onBack={onClose} title="QR Scanner" />

      {/* Add stylized header similar to Analytics */}
      <div className="scanner-header">
        <h2>
          <RiQrCodeFill /> QR Scanner
          {selectedEvent && (
            <span className="event-name"> - {selectedEvent.title}</span>
          )}
        </h2>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={handleRefreshScanner}
            disabled={isProcessing}
          >
            <RiRefreshLine className={isProcessing ? "spinning" : ""} />
          </button>
          <button className="close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>
      </div>

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

                {/* New Button for Member Chip Scanning */}
                <motion.button
                  className="scan-button member-scan-button" // Add a new class for styling
                  onClick={() => {
                    resetScanner(); // Ensure a clean state
                    setShowMemberFlow(true);
                    setScanning(false); // Not using QR scanning for this flow initially
                    setShowCamera(false); // Don't show camera immediately
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiUserLine /> {/* Or a more relevant icon */}
                  <span>Scan Member Chip</span>
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

              {!scannerError && (
                <motion.button
                  className={`capture-button ${
                    isOcrProcessing ? "processing" : ""
                  }`}
                  onClick={async () => {
                    if (
                      videoRef.current?.readyState ===
                        videoRef.current?.HAVE_ENOUGH_DATA &&
                      !isOcrProcessing
                    ) {
                      setIsOcrProcessing(true);
                    }
                  }}
                  disabled={isOcrProcessing}
                  whileHover={!isOcrProcessing ? { scale: 1.05 } : {}}
                  whileTap={!isOcrProcessing ? { scale: 0.95 } : {}}
                >
                  <span>Capture & Recognize</span>
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Member Scanning Flow UI placeholder - to be built out */}
          {showMemberFlow &&
            !scannedMemberData &&
            !showMemberRegistrationForm && (
              <motion.div
                className="member-flow-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Initial Manual Input for Member Number */}
                {!confirmedMemberNumber && (
                  <div className="member-manual-input">
                    <h2>Enter Member Chip Number</h2>
                    <input
                      type="text"
                      value={memberNumberInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ""); // Allow only digits
                        if (val.length <= 5) setMemberNumberInput(val);
                      }}
                      placeholder="Enter 5-digit number"
                      maxLength={5}
                    />
                    <motion.button
                      onClick={async () => {
                        if (
                          memberNumberInput.length !== 5 ||
                          isMemberProcessing
                        )
                          return;
                        setIsMemberProcessing(true);
                        setMemberErrorMessage(null);
                        try {
                          const response = await axiosInstance.get(
                            `/api/members/lookup/${memberNumberInput}?eventId=${
                              selectedEvent?._id || ""
                            }`
                          );
                          setScannedMemberData(response.data);
                          setConfirmedMemberNumber(memberNumberInput); // Keep for context if needed, though scannedMemberData now primary
                          setShowMemberRegistrationForm(false); // Ensure reg form is hidden
                        } catch (error) {
                          if (error.response?.status === 404) {
                            // Member not found, proceed to registration confirmation
                            setConfirmedMemberNumber(memberNumberInput); // Set this to trigger the confirmation step
                            setShowMemberRegistrationForm(false); // Hide reg form for now
                            setMemberErrorMessage(
                              "Member not found. Confirm number to register."
                            ); // Prompt for next step
                          } else {
                            const msg =
                              error.response?.data?.message ||
                              "Error looking up member.";
                            toast.showError(msg);
                            setMemberErrorMessage(msg);
                            setConfirmedMemberNumber(null); // Clear if error
                          }
                        }
                        setIsMemberProcessing(false);
                      }}
                      disabled={
                        memberNumberInput.length !== 5 || isMemberProcessing
                      }
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isMemberProcessing ? "Checking..." : "Check Number"}
                    </motion.button>
                    {memberErrorMessage && (
                      <p className="error-message">{memberErrorMessage}</p>
                    )}
                    <button
                      className="cancel-member-flow"
                      onClick={resetScanner}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Confirmation Step - if number not found initially by lookup but confirmed by user to proceed */}
                {confirmedMemberNumber &&
                  !scannedMemberData &&
                  !showMemberRegistrationForm && (
                    <div className="member-confirmation-step">
                      <h2>Is this the correct number?</h2>
                      <p className="confirmed-number-display">
                        {confirmedMemberNumber}
                      </p>
                      <div className="confirmation-actions">
                        <motion.button
                          className="confirm-yes"
                          onClick={() => setShowMemberRegistrationForm(true)} // Proceed to registration
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Yes, Register New Member
                        </motion.button>
                        <motion.button
                          className="confirm-no"
                          onClick={() => {
                            setConfirmedMemberNumber(null);
                            setMemberNumberInput("");
                            setMemberErrorMessage(null);
                          }} // Go back to input
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          No, Re-enter Number
                        </motion.button>
                      </div>
                    </div>
                  )}

                {showMemberRegistrationForm && (
                  <motion.div
                    className="member-registration-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2>Register New Member</h2>
                    <p>
                      Chip Number: <strong>{confirmedMemberNumber}</strong>
                    </p>
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        value={memberRegistrationData.firstName}
                        onChange={(e) =>
                          setMemberRegistrationData({
                            ...memberRegistrationData,
                            firstName: e.target.value,
                          })
                        }
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        value={memberRegistrationData.lastName}
                        onChange={(e) =>
                          setMemberRegistrationData({
                            ...memberRegistrationData,
                            lastName: e.target.value,
                          })
                        }
                        placeholder="Enter last name"
                      />
                    </div>
                    <motion.button
                      onClick={handleRegisterMember} // Implement this function
                      disabled={
                        !memberRegistrationData.firstName ||
                        !memberRegistrationData.lastName ||
                        isMemberProcessing
                      }
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isMemberProcessing
                        ? "Registering..."
                        : "Register Member"}
                    </motion.button>
                    {memberErrorMessage && (
                      <p className="error-message">{memberErrorMessage}</p>
                    )}
                    <button
                      className="cancel-member-flow"
                      onClick={() => {
                        setShowMemberRegistrationForm(false);
                        setConfirmedMemberNumber(null);
                        setMemberErrorMessage(null);
                      }}
                    >
                      Back
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

          {showMemberFlow && scannedMemberData && (
            <motion.div
              className="member-scan-result" // Similar to scan-result but for members
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="result-header member-header">
                {" "}
                {/* Add a distinct class or style */}
                <h2>Member Verified</h2>
                {selectedEvent && (
                  <div className="result-event">
                    <p>{selectedEvent.title}</p>
                  </div>
                )}
              </div>
              <div className="result-details">
                <div className="detail-item">
                  <RiUserLine />
                  <div>
                    <label>Name</label>
                    <p>
                      {scannedMemberData.firstName} {scannedMemberData.lastName}
                    </p>
                  </div>
                </div>
                <div className="detail-item">
                  <RiQrCodeFill /> {/* Placeholder icon */}
                  <div>
                    <label>Member Number</label>
                    <p>{scannedMemberData.memberNumber}</p>
                  </div>
                </div>
              </div>

              <div className="counter-section">
                <div className="counter-label">
                  <span>People</span>
                  <div className="counter-info">
                    <span className="current">
                      {scannedMemberData.paxChecked}
                    </span>
                    <span className="divider">/</span>
                    <span className="max">{scannedMemberData.pax}</span>
                  </div>
                </div>
                <div className="counter-controls">
                  <motion.button
                    className="counter-btn decrease"
                    onClick={() => handleMemberPaxUpdate(false)} // Implement this function
                    disabled={
                      isMemberProcessing || scannedMemberData.paxChecked <= 0
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiArrowLeftLine />
                  </motion.button>
                  <motion.button
                    className="counter-btn increase"
                    onClick={() => handleMemberPaxUpdate(true)} // Implement this function
                    disabled={
                      isMemberProcessing ||
                      scannedMemberData.paxChecked >= scannedMemberData.pax
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiArrowRightLine />
                  </motion.button>
                </div>
              </div>
              <motion.button
                className="scan-again-btn"
                onClick={resetScanner} // Will reset member flow too
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RiQrScanLine />
                <span>Scan Next</span>
              </motion.button>
            </motion.div>
          )}

          {scanResult && !showMemberFlow && (
            <motion.div
              className={`scan-result ${getCodeColorClass()}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`result-header ${getCodeColorClass()}`} style={getCustomColorStyle()}>
                <h2>{scanResult.name}</h2>
                {scanResult.eventDetails && (
                  <div className="result-event">
                    <p>{scanResult.eventDetails.title}</p>
                  </div>
                )}
              </div>

              <div className="result-details">
                <div className="detail-item">
                  <RiQrCodeFill />
                  <div>
                    <label>Code</label>
                    <p>{scanResult.code}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <RiInformationLine />
                  <div>
                    <label>Type</label>
                    <p>{scanResult.typeOfTicket}</p>
                  </div>
                </div>

                {scanResult.tableNumber && (
                  <div className="detail-item">
                    <RiQrCodeFill />
                    <div>
                      <label>Table</label>
                      <p>{scanResult.tableNumber}</p>
                    </div>
                  </div>
                )}

                {scanResult.condition && (
                  <div className="detail-item highlight-condition">
                    <RiInformationLine />
                    <div>
                      <label>Special Instructions</label>
                      <p>{scanResult.condition}</p>
                    </div>
                  </div>
                )}

                {scanResult.metadata?.hostName && (
                  <div className="detail-item">
                    <RiUserLine />
                    <div>
                      <label>Host</label>
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
                <span>Scan Next</span>
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
