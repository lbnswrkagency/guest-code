// TableCodeManagement.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig"; // Import configured axiosInstance
import { useToast } from "../Toast/ToastContext";
import "./TableCodeManagement.scss";

function TableCodeManagement({
  user,
  userRoles = [],
  triggerRefresh,
  tableCategories,
  layoutConfig,
  refreshTrigger,
  selectedEvent,
  counts,
  isLoading: parentIsLoading,
}) {
  const toast = useToast();
  const [codesByCategory, setCodesByCategory] = useState({});
  const [editCodeId, setEditCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPax, setEditPax] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [pngUrl, setPngUrl] = useState("");
  const [showPngModal, setShowPngModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelCodeId, setCancelCodeId] = useState(null);

  // Dynamic color mapping for categories based on layout config
  const getTableColors = () => {
    if (layoutConfig?.tableConfig) {
      // Use dynamic layout configuration
      const colors = {};
      Object.values(layoutConfig.tableConfig).forEach((tableInfo) => {
        if (tableInfo.category) {
          const areaName = layoutConfig.categoryAreaNames?.[tableInfo.category];
          if (areaName) {
            // Map category to appropriate color
            switch (tableInfo.category) {
              case "D": // DJ Area in Venti
                colors[areaName] = "#ffd700";
                break;
              case "V": // VIP in Venti
                colors[areaName] = "#1b5e20";
                break;
              case "U": // Upstairs in Venti
                colors[areaName] = "#663399";
                break;
              default:
                colors[areaName] = "#4a90e2";
            }
          }
        }
      });
      return colors;
    }
    
    // Fallback to default mapping for backward compatibility
    return {
      djarea: "#ffd700", // Gold for DJ Area tables
      backstage: "#80221c", // Rich red for backstage/dancefloor
      vip: "#1b5e20", // Green for VIP
      premium: "#4a90e2", // Blue for premium/front row
    };
  };

  const tableColors = getTableColors();

  // Dynamic category order based on layout config
  const getCategoryOrder = () => {
    if (layoutConfig?.categoryAreaNames) {
      return Object.values(layoutConfig.categoryAreaNames);
    }
    if (tableCategories) {
      return Object.keys(tableCategories);
    }
    // Fallback to default order
    return ["djarea", "backstage", "vip", "premium"];
  };

  const categoryOrder = getCategoryOrder();

  // Calculate table permissions from user roles
  const getTablePermissions = () => {
    let hasTableAccess = false;
    let hasTableManage = false;

    // Loop through all user roles to check table permissions
    userRoles.forEach((role) => {
      if (role.permissions && role.permissions.tables) {
        if (role.permissions.tables.access === true) {
          hasTableAccess = true;
        }
        if (role.permissions.tables.manage === true) {
          hasTableManage = true;
        }
      }
    });

    return {
      access: hasTableAccess,
      manage: hasTableManage,
    };
  };

  const tablePermissions = getTablePermissions();

  // Dynamic category mapping function
  const getCategoryForTable = (tableNumber) => {
    if (!tableNumber) return "unknown";

    // If we have layout configuration, use it for categorization
    if (layoutConfig && layoutConfig.tableConfig && layoutConfig.categoryAreaNames) {
      const tableInfo = layoutConfig.tableConfig[tableNumber];

      if (tableInfo && tableInfo.category) {
        // Return the actual area name from the layout configuration
        const areaName = layoutConfig.categoryAreaNames[tableInfo.category];
        if (areaName) {
          return areaName;
        }
      }
    }

    // Fallback: check if we have tableCategories prop
    if (tableCategories) {
      for (const [category, tables] of Object.entries(tableCategories)) {
        if (tables.includes(tableNumber)) {
          return category;
        }
      }
    }

    // Final fallback to checking first character of table number
    const prefix = tableNumber.charAt(0);

    // Handle common layouts
    if (prefix === "D") return "DJ Area"; // DJ Area tables
    if (prefix === "V") return "VIP Lounge"; // VIP tables
    if (prefix === "U") return "Upstairs"; // Upstairs tables
    if (prefix === "B") return "DJ Area"; // DJ Area tables (alternate)
    if (prefix === "A" || prefix === "R") return "VIP";
    if (prefix === "F") return "Premium";
    if (prefix === "K") return "Premium";

    return "General"; // Default
  };

  // Get display name for category
  const getCategoryDisplayName = (category) => {
    if (layoutConfig && category) {
      // Map category code to display name based on dynamic configuration
      switch (category) {
        case "backstage":
          return "Dancefloor"; // D tables
        case "vip":
          return "VIP Booth"; // V tables
        case "premium":
          return "Front Row"; // F tables
        case "djarea":
          return "DJ Area"; // B tables
        default:
          break;
      }
    }

    // Default fallback names
    if (category === "djarea") return "DJ Area";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  useEffect(() => {
    const allCodes = counts?.tableCounts || [];

    // Group the codes received from props
    const groupedCodes = categoryOrder.reduce((acc, category) => {
      acc[category] = allCodes.filter(
        (code) => getCategoryForTable(code.tableNumber) === category
      );
      return acc;
    }, {});

    setCodesByCategory(groupedCodes);
  }, [counts, refreshTrigger, layoutConfig]);

  const allCodes = counts?.tableCounts || [];
  const activeTableCodes = allCodes.filter(
    (code) => code.status !== "declined" && code.status !== "cancelled"
  );
  const tablesBookedCount = activeTableCodes.length;
  const totalTables = Object.values(tableCategories).reduce(
    (sum, tables) => sum + tables.length,
    0
  );
  const tablesLeft = totalTables - tablesBookedCount;

  const handleDeleteClick = (codeId) => {
    setDeleteCodeId(codeId);
    setShowConfirmDelete(true);
  };

  const handleCancelClick = (codeId) => {
    setCancelCodeId(codeId);
    setShowConfirmCancel(true);
  };

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    if (deleteCodeId) {
      setIsLoading(true);
      try {
        const loadingToast = toast.showLoading("Deleting reservation...");
        // Use axiosInstance with token refresh capability
        await axiosInstance.delete(`/code/table/delete/${deleteCodeId}`);
        loadingToast.dismiss();
        toast.showSuccess("Reservation deleted successfully");
        triggerRefresh();

        const event = new CustomEvent("tableCountUpdated", {
          detail: { type: "delete" },
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("Error deleting reservation", error);
        toast.showError(
          error.response?.data?.message || "Failed to delete reservation"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const confirmCancel = async () => {
    setShowConfirmCancel(false);
    if (cancelCodeId) {
      setIsLoading(true);
      try {
        const loadingToast = toast.showLoading("Cancelling reservation...");

        // Get the code details to check if it's a public request
        const code = allCodes.find((c) => c._id === cancelCodeId);
        const isPublicRequest = code?.isPublic === true;

        // Update the status to cancelled
        // Use axiosInstance with token refresh capability
        await axiosInstance.put(`/code/table/status/${cancelCodeId}`, {
          status: "cancelled",
        });

        // If this is a public request with email, also send cancellation email
        if (isPublicRequest && code.email) {
          try {
            // Use axiosInstance with token refresh capability
            await axiosInstance.post(`/table/code/${cancelCodeId}/cancel`, {});
            loadingToast.dismiss();
            toast.showSuccess(
              "Reservation cancelled and notification email sent!",
              { duration: 4000 }
            );
          } catch (emailError) {
            console.error("Error sending cancellation email:", emailError);
            loadingToast.dismiss();
            toast.showSuccess(
              "Reservation cancelled, but email failed to send."
            );
            toast.showError(
              "Failed to send cancellation email. Please contact the guest manually."
            );
          }
        } else {
          loadingToast.dismiss();
          toast.showSuccess("Reservation cancelled successfully");
        }

        triggerRefresh();

        const event = new CustomEvent("tableCountUpdated", {
          detail: { type: "cancel" },
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        toast.showError(
          error.response?.data?.message || "Failed to cancel reservation"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStatusChange = async (codeId, newStatus) => {
    if (newStatus === "cancelled") {
      handleCancelClick(codeId);
      return;
    }

    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading(
        `${
          newStatus === "confirmed" ? "Confirming" : "Updating"
        } reservation...`
      );

      // Get the code details to check if it's a public request
      const code = allCodes.find((c) => c._id === codeId);
      const isPublicRequest = code?.isPublic === true;

      // Update the status
      // Use axiosInstance with token refresh capability
      await axiosInstance.put(`/code/table/status/${codeId}`, {
        status: newStatus,
      });

      // If this is confirming a public request that has an email, also send confirmation email
      if (newStatus === "confirmed" && isPublicRequest && code.email) {
        try {
          // Use axiosInstance with token refresh capability
          await axiosInstance.post(`/table/code/${codeId}/confirm`, {});
          loadingToast.dismiss();
          toast.showSuccess(
            "Reservation confirmed and confirmation email sent!",
            { duration: 4000 }
          );
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
          loadingToast.dismiss();
          toast.showSuccess("Reservation confirmed, but email failed to send.");
          toast.showError(
            "Failed to send confirmation email. Please try sending it manually."
          );
        }
      }
      // If this is declining a public request that has an email, send decline email
      else if (newStatus === "declined" && isPublicRequest && code.email) {
        try {
          await axiosInstance.post(
            `/table/code/${codeId}/decline`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          loadingToast.dismiss();
          toast.showSuccess(
            "Reservation declined and notification email sent!",
            { duration: 4000 }
          );
        } catch (emailError) {
          console.error("Error sending decline email:", emailError);
          loadingToast.dismiss();
          toast.showSuccess("Reservation declined, but email failed to send.");
          toast.showError(
            "Failed to send decline email. Please contact the guest manually."
          );
        }
      } else {
        loadingToast.dismiss();
        toast.showSuccess(
          `Reservation ${newStatus === "confirmed" ? "confirmed" : "updated"}`
        );
      }

      triggerRefresh();

      const event = new CustomEvent("tableCountUpdated", {
        detail: { type: "statusChange", status: newStatus },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.showError(
        error.response?.data?.message || "Failed to update status"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading("Preparing your table code...");
      // Use axiosInstance with token refresh capability
      const response = await axiosInstance.get(`/table/code/${codeId}/png`, {
        responseType: "blob",
      });
      const reader = new FileReader();
      reader.readAsDataURL(response.data);
      reader.onloadend = () => {
        setPngUrl(reader.result);
        setShowPngModal(true);
        loadingToast.dismiss();
        setIsLoading(false);
      };
    } catch (error) {
      console.error("Error viewing code:", error);
      toast.showError(
        error.response?.data?.message || "Failed to view the table code"
      );
      setIsLoading(false);
    }
  };

  const handleDownload = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading(
        "Downloading table code as PNG..."
      );
      const code = allCodes.find((c) => c._id === codeId);
      if (!code) {
        toast.showError("Code not found");
        setIsLoading(false);
        return;
      }
      // Use axiosInstance with token refresh capability
      const response = await axiosInstance.get(
        `/table/code/${codeId}/png-download`,
        {
          responseType: "blob",
        }
      );
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Table_${code.tableNumber}_${code.name.replace(/\s+/g, "_")}.png`
      );
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsLoading(false);
        loadingToast.dismiss();
        toast.showSuccess("Table code downloaded successfully");
      }, 500);
    } catch (error) {
      console.error("Error downloading code:", error);
      toast.showError(
        error.response?.data?.message || "Failed to download the table code"
      );
      setIsLoading(false);
    }
  };

  const handleSendEmail = (codeId) => {
    const code = allCodes.find((c) => c._id === codeId);
    if (code) {
      setEmailRecipient(code.email || "");
      setSelectedCodeId(codeId);
      setShowSendEmailModal(true);
    }
  };

  const confirmSendEmail = async () => {
    if (!emailRecipient || !selectedCodeId) {
      toast.showError("Email address is required");
      return;
    }
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(emailRecipient)) {
      toast.showError("Please enter a valid email address");
      return;
    }
    setIsSendingEmail(true);
    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading("Sending email...");
      // Use axiosInstance with token refresh capability
      await axiosInstance.post(`/table/code/${selectedCodeId}/send`, {
        email: emailRecipient,
      });
      loadingToast.dismiss();
      toast.showSuccess("Table code sent successfully");
      setShowSendEmailModal(false);
      setEmailRecipient("");
      setSelectedCodeId(null);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.showError(error.response?.data?.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
      setIsLoading(false);
    }
  };

  const startEdit = (code) => {
    setEditCodeId(code._id);
    setEditName(code.name);
    setEditPax(code.pax);
    setEditTableNumber(code.tableNumber);
  };

  const handleEdit = async () => {
    setIsLoading(true);
    try {
      const loadingToast = toast.showLoading("Updating reservation...");

      // Get the original code before updating
      const originalCode = allCodes.find((c) => c._id === editCodeId);
      const hasChanges =
        originalCode.name !== editName ||
        originalCode.pax != editPax ||
        originalCode.tableNumber !== editTableNumber;

      // Only process if there are actual changes
      if (!hasChanges) {
        loadingToast.dismiss();
        toast.showInfo("No changes detected");
        setEditCodeId(null);
        resetEditFields();
        return;
      }

      // Update the table code
      // Use axiosInstance with token refresh capability
      await axiosInstance.put(`/code/table/edit/${editCodeId}`, {
        name: editName,
        pax: editPax,
        tableNumber: editTableNumber,
      });

      // Send update notification if this is a public request or has an email
      if (originalCode?.isPublic && originalCode.email) {
        try {
          await axiosInstance.post(`/table/code/${editCodeId}/update`, {
            email: originalCode.email,
          });
          loadingToast.dismiss();
          toast.showSuccess(
            "Reservation updated and notification email sent!",
            { duration: 4000 }
          );
        } catch (emailError) {
          console.error("Error sending update email:", emailError);
          loadingToast.dismiss();
          toast.showSuccess("Reservation updated, but email failed to send.");
        }
      } else {
        loadingToast.dismiss();
        toast.showSuccess("Reservation updated successfully");

        // Ask if user wants to send an update email
        if (originalCode?.email) {
          setTimeout(() => {
            if (
              window.confirm(
                "Do you want to send an update email to the guest?"
              )
            ) {
              handleSendEmail(editCodeId);
            }
          }, 500);
        }
      }

      triggerRefresh();
      setEditCodeId(null);
      resetEditFields();

      const event = new CustomEvent("tableCountUpdated", {
        detail: { type: "edit" },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.showError(
        error.response?.data?.message || "Failed to update reservation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetEditFields = () => {
    setEditCodeId(null);
    setEditName("");
    setEditPax("");
    setEditTableNumber("");
  };

  const isTableBooked = (table) => {
    return allCodes.some(
      (code) =>
        code.tableNumber === table &&
        code.status !== "declined" &&
        code.status !== "cancelled" &&
        code._id !== editCodeId
    );
  };

  const getCategoryCounts = (category) => {
    const categoryItems =
      allCodes.filter(
        (code) => getCategoryForTable(code.tableNumber) === category
      ) || [];

    // Find the correct tableCategories key for this display category
    let totalTablesInCategory = 0;
    
    if (tableCategories) {
      // Map display names back to tableCategories keys
      const categoryKey = (() => {
        // Direct key match first
        if (tableCategories[category]) {
          return category;
        }
        
        // Map display names to tableCategories keys
        const displayToKeyMap = {
          "DJ Area": "djarea",
          "VIP Lounge": "vip", 
          "Upstairs": "upstairs",
          "VIP": "vip",
          "VIP Booth": "vip",
          "Premium": "premium",
          "Front Row": "premium", 
          "General": "general",
          "Dancefloor": "backstage",
          "Backstage": "backstage"
        };
        
        return displayToKeyMap[category] || category.toLowerCase();
      })();
      
      totalTablesInCategory = tableCategories[categoryKey]?.length || 0;
    }

    const acceptedCount = categoryItems.filter(
      (code) => code.status === "confirmed"
    ).length;
    const pendingCount = categoryItems.filter(
      (code) => code.status === "pending"
    ).length;

    return {
      total: totalTablesInCategory,
      accepted: acceptedCount,
      pending: pendingCount,
    };
  };

  const renderCategoryTitle = (category) => {
    const counts = getCategoryCounts(category);
    const displayName = getCategoryDisplayName(category);

    return (
      <div className="category-header">
        <h3>
          <span style={{ color: tableColors[category] }}>{displayName}</span>
          <div className="category-counts">
            {tablePermissions.manage ? (
              <>
                {counts.pending > 0 && (
                  <span className="count-pending">
                    {counts.pending} Pending
                  </span>
                )}
                <span className="count-total">
                  {counts.accepted}/{counts.total} Reserved
                </span>
              </>
            ) : (
              <span className="count-total">
                {counts.accepted}/{counts.total} Confirmed
              </span>
            )}
          </div>
        </h3>
      </div>
    );
  };

  const renderCodeItem = (code) => {
    const category = getCategoryForTable(code.tableNumber);
    const borderColor = tableColors[category] || "#ccc";
    const isEditing = editCodeId === code._id;
    const isPublicRequest = code.isPublic === true; // Check if this is a public request

    // Get table config for maximum persons setting
    let maxPersons = 10; // default fallback
    if (layoutConfig && layoutConfig.tableConfig) {
      const tableInfo =
        layoutConfig.tableConfig[
          isEditing ? editTableNumber : code.tableNumber
        ];
      if (tableInfo && tableInfo.maxPersons) {
        maxPersons = tableInfo.maxPersons;
      }
    }

    return (
      <div
        key={code._id}
        className={`reservation-item ${code.status} ${
          code.paxChecked > 0 ? "checked-in" : ""
        } ${isEditing ? "editing" : ""} ${
          isPublicRequest ? "public-request" : ""
        }`}
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <div className="reservation-details">
          <div className="reservation-info">
            <div
              className={`table-number-badge ${
                isEditing ? "editing-dropdown" : ""
              }`}
              style={{
                background: `linear-gradient(45deg, ${borderColor}, ${borderColor}dd)`,
              }}
            >
              {isEditing ? (
                <div className="table-select-inline-wrapper">
                  <select
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="table-select-inline"
                    aria-label="Change table number"
                  >
                    {categoryOrder.map((category) => (
                      <optgroup
                        key={category}
                        label={getCategoryDisplayName(category)}
                      >
                        {tableCategories[category]?.map((table) => (
                          <option
                            key={table}
                            value={table}
                            disabled={isTableBooked(table)}
                          >
                            {table}
                          </option>
                        )) || null}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                code.tableNumber
              )}
            </div>
            <div className="guest-details">
              {isEditing ? (
                <input
                  type="text"
                  className="edit-name-input"
                  placeholder="Guest Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="guest-name">{code.name}</div>
              )}
              {/* Show contact information for public requests */}
              {isPublicRequest && (
                <div className="contact-details">
                  {code.email && (
                    <div className="guest-email">{code.email}</div>
                  )}
                  {code.phone && (
                    <div className="guest-phone">{code.phone}</div>
                  )}
                </div>
              )}
              <div className="host-name">
                {isPublicRequest ? "Public Request" : `Host: ${code.host}`}
              </div>
              <span className={`status-badge ${code.status}`}>
                {code.status}
              </span>
            </div>
          </div>

          <div className="pax-count-badge">
            <span className="people-icon">👥</span>
            <span className="people-count">
              {code.paxChecked > 0 ? code.paxChecked : 0}
            </span>
            <span className="people-separator">/</span>
            {isEditing ? (
              <select
                className="edit-pax-select"
                value={editPax}
                onChange={(e) => setEditPax(e.target.value)}
              >
                {[...Array(maxPersons)].map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
            ) : (
              <span className="people-max">{code.pax}</span>
            )}
          </div>

          <div className="reservation-actions">
            {isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="save-edit-btn"
                  title="Save"
                  disabled={isLoading}
                >
                  ✓
                </button>
                <button
                  onClick={resetEditFields}
                  className="cancel-edit-btn"
                  title="Cancel"
                  disabled={isLoading}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                {tablePermissions.manage ? (
                  <>
                    {code.status === "pending" && (
                      <>
                        <button
                          className="confirm"
                          onClick={() =>
                            handleStatusChange(code._id, "confirmed")
                          }
                          title="Confirm"
                          disabled={isLoading}
                        >
                          ✓
                        </button>
                        <button
                          className="decline"
                          onClick={() =>
                            handleStatusChange(code._id, "declined")
                          }
                          title="Decline"
                          disabled={isLoading}
                        >
                          ✕
                        </button>
                        <button
                          className="edit"
                          onClick={() => startEdit(code)}
                          title="Edit"
                          disabled={isLoading}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete"
                          onClick={() => handleDeleteClick(code._id)}
                          title="Delete"
                          disabled={isLoading}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    {code.status === "confirmed" && (
                      <>
                        <button
                          className="email"
                          onClick={() => handleSendEmail(code._id)}
                          title="Send Email"
                          disabled={isLoading}
                        >
                          📧
                        </button>
                        <button
                          className="download"
                          onClick={() => handleDownload(code._id)}
                          title="Download"
                          disabled={isLoading}
                        >
                          📥
                        </button>
                        <button
                          className="view"
                          onClick={() => handleCodeView(code._id)}
                          title="View QR"
                          disabled={isLoading}
                        >
                          👁️
                        </button>
                        <button
                          className="edit"
                          onClick={() => startEdit(code)}
                          title="Edit"
                          disabled={isLoading}
                        >
                          ✏️
                        </button>
                        <button
                          className="cancel"
                          onClick={() => handleCancelClick(code._id)}
                          title="Cancel Reservation"
                          disabled={isLoading}
                        >
                          ❌
                        </button>
                      </>
                    )}
                    {["declined", "cancelled"].includes(code.status) && (
                      <>
                        <button
                          className="reset"
                          onClick={() =>
                            handleStatusChange(code._id, "pending")
                          }
                          title="Reset to Pending"
                          disabled={isLoading}
                        >
                          🔄
                        </button>
                        <button
                          className="delete"
                          onClick={() => handleDeleteClick(code._id)}
                          title="Delete"
                          disabled={isLoading}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {code.hostId === user?._id && (
                      <>
                        {code.status === "pending" && (
                          <>
                            <button
                              className="edit"
                              onClick={() => startEdit(code)}
                              title="Edit"
                              disabled={isLoading}
                            >
                              ✏️
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeleteClick(code._id)}
                              title="Delete"
                              disabled={isLoading}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {code.status === "confirmed" && (
                          <>
                            <button
                              className="email"
                              onClick={() => handleSendEmail(code._id)}
                              title="Send Email"
                              disabled={isLoading}
                            >
                              📧
                            </button>
                            <button
                              className="download"
                              onClick={() => handleDownload(code._id)}
                              title="Download"
                              disabled={isLoading}
                            >
                              📥
                            </button>
                            <button
                              className="view"
                              onClick={() => handleCodeView(code._id)}
                              title="View QR"
                              disabled={isLoading}
                            >
                              👁️
                            </button>
                            <button
                              className="edit"
                              onClick={() => startEdit(code)}
                              title="Edit"
                              disabled={isLoading}
                            >
                              ✏️
                            </button>
                            <button
                              className="cancel"
                              onClick={() => handleCancelClick(code._id)}
                              title="Cancel Reservation"
                              disabled={isLoading}
                            >
                              ❌
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="table-code-management">
      {showPngModal && (
        <div className="code-png-modal">
          <button className="close-btn" onClick={() => setShowPngModal(false)}>
            ✕
          </button>
          <div className="png-container">
            <img src={pngUrl} alt="Table Code" />
          </div>
        </div>
      )}
      {showSendEmailModal && (
        <div className="send-email-modal-overlay">
          <div className="send-email-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowSendEmailModal(false)}
            >
              ×
            </button>
            <h3>Send Invitation to</h3>
            <input
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="recipient@example.com"
              disabled={isSendingEmail}
              autoFocus
            />
            <div className="send-email-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowSendEmailModal(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={confirmSendEmail}
                disabled={isSendingEmail || !emailRecipient}
              >
                {isSendingEmail ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmDelete && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowConfirmDelete(false)}
            >
              ✕
            </button>
            <h3>Delete Reservation</h3>
            <p>Are you sure you want to delete this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmCancel && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowConfirmCancel(false)}
            >
              ✕
            </button>
            <h3>Cancel Reservation</h3>
            <p>Are you sure you want to cancel this reservation?</p>
            <div className="delete-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmCancel(false)}
              >
                Close
              </button>
              <button className="confirm-btn" onClick={confirmCancel}>
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {parentIsLoading ? (
        <div className="loading-state">
          <p>Loading reservations...</p>
        </div>
      ) : allCodes.length === 0 ? (
        <div className="no-reservations">
          <p>No table reservations found for this event.</p>
          <p>Create a new reservation by selecting a table above.</p>
        </div>
      ) : (
        <div className="reservations-list">
          {categoryOrder.map((category) => {
            const categoryItems = codesByCategory[category];

            return categoryItems?.length > 0 ? (
              <div key={category} className="table-category">
                {renderCategoryTitle(category)}
                {categoryItems.map((code) => renderCodeItem(code))}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default TableCodeManagement;
