// TableCodeManagement.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig"; // Import configured axiosInstance
import { useToast } from "../Toast/ToastContext";
import { RiRefreshLine } from "react-icons/ri";
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
  effectivePermissions, // Pre-calculated permissions for co-hosted events
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
  const [visibleCategories, setVisibleCategories] = useState(new Set());
  const [isSpinning, setIsSpinning] = useState(false);

  // Dynamic color mapping for categories based on layout config
  const getTableColors = () => {
    if (layoutConfig?.categoryThemeColors && layoutConfig?.categoryAreaNames) {
      // Use theme colors from layout configuration
      const colors = {};
      Object.entries(layoutConfig.categoryAreaNames).forEach(([categoryCode, areaName]) => {
        const themeColor = layoutConfig.categoryThemeColors[categoryCode];
        if (themeColor) {
          // Use the accent color as the primary display color
          colors[areaName] = themeColor.accent;
        }
      });
      return colors;
    }
    
    // Legacy dynamic layout configuration for other layouts
    if (layoutConfig?.tableConfig) {
      const colors = {};
      Object.values(layoutConfig.tableConfig).forEach((tableInfo) => {
        if (tableInfo.category) {
          const areaName = layoutConfig.categoryAreaNames?.[tableInfo.category];
          if (areaName) {
            // Map category to appropriate color for legacy layouts
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
      standing: "#0f3460", // Blue for standing tables
      "Standing": "#0f3460", // Blue for standing tables
      "Standing Backstage": "#b8860b", // Orange for standing backstage
      "VIP": "#b8860b", // Gold for VIP
      "Backstage": "#d4af37", // Gold for backstage
      "Exclusive Backstage": "#ffd700", // Bright gold for exclusive
    };
  };

  const tableColors = getTableColors();

  // Dynamic category order based on layout config - memoized to prevent re-calculation
  const categoryOrder = useMemo(() => {
    if (layoutConfig?.categoryAreaNames) {
      return Object.values(layoutConfig.categoryAreaNames);
    }
    if (tableCategories) {
      return Object.keys(tableCategories);
    }
    // Fallback to default order
    return ["djarea", "backstage", "vip", "premium"];
  }, [layoutConfig, tableCategories]);

  // Helper to get tables for a category - handles both display names ("VIP") and keys ("vip")
  const getTablesForCategory = useCallback((category) => {
    if (!tableCategories || !category) return [];

    // Direct match (category is a tableCategories key like "vip")
    if (tableCategories[category]) {
      return tableCategories[category];
    }

    // Try lowercase match (category is display name like "VIP" or "Standing")
    const lowercaseCategory = category.toLowerCase();
    if (tableCategories[lowercaseCategory]) {
      return tableCategories[lowercaseCategory];
    }

    // Try to find by partial match (e.g., "VIP Booth" matches "vip")
    for (const [key, tables] of Object.entries(tableCategories)) {
      if (lowercaseCategory.includes(key.toLowerCase()) ||
          key.toLowerCase().includes(lowercaseCategory)) {
        return tables;
      }
    }

    return [];
  }, [tableCategories]);

  // Calculate table permissions from user roles or co-host permissions
  const getTablePermissions = () => {
    let hasTableAccess = false;
    let hasTableManage = false;

    // Use effectivePermissions prop first (from Dashboard), then fall back to selectedEvent
    // This ensures co-host permissions work even if selectedEvent doesn't have coHostBrandInfo
    const perms = effectivePermissions ||
                  selectedEvent?.coHostBrandInfo?.effectivePermissions;

    if (perms?.tables) {
      hasTableAccess = perms.tables.access === true;
      hasTableManage = perms.tables.manage === true;
    } else {
      // Fallback for regular events: check user roles
      userRoles.forEach((role) => {
        if (role.permissions?.tables) {
          if (role.permissions.tables.access === true) {
            hasTableAccess = true;
          }
          if (role.permissions.tables.manage === true) {
            hasTableManage = true;
          }
        }
      });
    }

    return {
      access: hasTableAccess,
      manage: hasTableManage,
    };
  };

  const tablePermissions = getTablePermissions();

  // Dynamic category mapping function - memoized to prevent re-creation
  const getCategoryForTable = useMemo(() => {
    return (tableNumber) => {
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
  }, [layoutConfig, tableCategories]);

  // Toggle category visibility - show ONLY the selected category
  const toggleCategoryVisibility = (category) => {
    const isCurrentlyVisible = visibleCategories.has(category);
    const isOnlyVisible = visibleCategories.size === 1 && visibleCategories.has(category);
    
    if (isOnlyVisible) {
      // If this is the only visible category, show all categories
      setVisibleCategories(new Set(categoryOrder));
    } else {
      // Show only this category
      setVisibleCategories(new Set([category]));
    }
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
  }, [counts, refreshTrigger, categoryOrder, getCategoryForTable]);

  // Initialize all categories as visible when categoryOrder loads
  useEffect(() => {
    if (categoryOrder.length > 0) {
      setVisibleCategories(new Set(categoryOrder));
    }
  }, [categoryOrder]);

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

    // Calculate total tables for this category
    let totalTablesInCategory = 0;
    
    // If we have layoutConfig, count tables from the dynamic configuration
    if (layoutConfig && layoutConfig.tableConfig && layoutConfig.categoryAreaNames) {
      // Count tables in layoutConfig that belong to this category
      Object.entries(layoutConfig.tableConfig).forEach(([tableNumber, tableInfo]) => {
        if (tableInfo.category && layoutConfig.categoryAreaNames[tableInfo.category] === category) {
          totalTablesInCategory++;
        }
      });
    } else if (tableCategories) {
      // Fallback to static tableCategories
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

    // Get theme colors for this category if available
    const getThemeColorsForCategory = () => {
      if (layoutConfig?.categoryThemeColors && layoutConfig?.categoryAreaNames) {
        // Find the category code for this area name
        const categoryCode = Object.entries(layoutConfig.categoryAreaNames)
          .find(([code, name]) => name === category)?.[0];
        
        if (categoryCode && layoutConfig.categoryThemeColors[categoryCode]) {
          return layoutConfig.categoryThemeColors[categoryCode];
        }
      }
      return null;
    };

    const themeColors = getThemeColorsForCategory();
    const primaryColor = tableColors[category] || "#4a90e2";

    return (
      <div 
        className="category-header"
        style={themeColors ? {
          background: `linear-gradient(135deg, ${themeColors.primary}22, ${themeColors.accent}11)`,
          borderLeft: `3px solid ${themeColors.accent}`,
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '0.5rem'
        } : undefined}
      >
        <h3>
          <span 
            style={{ 
              color: themeColors?.accent || primaryColor,
              textShadow: themeColors ? `0 0 8px ${themeColors.accent}33` : undefined,
              fontWeight: '600'
            }}
          >
            {displayName}
          </span>
          <div className="category-counts">
            {tablePermissions.manage ? (
              <>
                {counts.pending > 0 && (
                  <span 
                    className="count-pending"
                    style={themeColors ? {
                      color: themeColors.text,
                      backgroundColor: `${themeColors.accent}20`,
                      border: `1px solid ${themeColors.accent}50`,
                      borderRadius: '12px',
                      padding: '2px 8px'
                    } : undefined}
                  >
                    {counts.pending} Pending
                  </span>
                )}
                <span 
                  className="count-total"
                  style={themeColors ? {
                    color: themeColors.text,
                    backgroundColor: `${themeColors.primary}40`,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: '12px',
                    padding: '2px 8px'
                  } : undefined}
                >
                  {counts.accepted}/{counts.total} Reserved
                </span>
              </>
            ) : (
              <span 
                className="count-total"
                style={themeColors ? {
                  color: themeColors.text,
                  backgroundColor: `${themeColors.primary}40`,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '12px',
                  padding: '2px 8px'
                } : undefined}
              >
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

    // Get theme colors for this category if available
    const getThemeColorsForCategory = () => {
      if (layoutConfig?.categoryThemeColors && layoutConfig?.categoryAreaNames) {
        // Find the category code for this area name
        const categoryCode = Object.entries(layoutConfig.categoryAreaNames)
          .find(([code, name]) => name === category)?.[0];
        
        if (categoryCode && layoutConfig.categoryThemeColors[categoryCode]) {
          return layoutConfig.categoryThemeColors[categoryCode];
        }
      }
      return null;
    };

    const themeColors = getThemeColorsForCategory();

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
        style={{ borderLeft: `4px solid ${themeColors?.accent || borderColor}` }}
      >
        <div className="reservation-details">
          <div className="reservation-info">
            <div
              className={`table-number-badge ${
                isEditing ? "editing-dropdown" : ""
              }`}
              style={{
                background: themeColors 
                  ? `linear-gradient(45deg, ${themeColors.accent}, ${themeColors.primary}dd)`
                  : `linear-gradient(45deg, ${borderColor}, ${borderColor}dd)`,
                boxShadow: themeColors 
                  ? `0 0 12px ${themeColors.accent}40`
                  : undefined,
                border: themeColors 
                  ? `1px solid ${themeColors.border}`
                  : undefined,
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
                    {categoryOrder.map((category) => {
                      const tables = getTablesForCategory(category);
                      return tables.length > 0 ? (
                        <optgroup
                          key={category}
                          label={getCategoryDisplayName(category)}
                        >
                          {tables.map((table) => (
                            <option
                              key={table}
                              value={table}
                              disabled={isTableBooked(table)}
                            >
                              {table}
                            </option>
                          ))}
                        </optgroup>
                      ) : null;
                    })}
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

  // Show all categories
  const showAllCategories = () => {
    setVisibleCategories(new Set(categoryOrder));
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setIsSpinning(true);
    triggerRefresh();
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000);
  };

  // Render the filter bar
  const renderFilterBar = () => {
    const allVisible = categoryOrder.every(cat => visibleCategories.has(cat));
    const totalReservations = categoryOrder.reduce((sum, category) => {
      const counts = getCategoryCounts(category);
      return sum + counts.accepted + counts.pending;
    }, 0);

    return (
      <div className="category-filter-bar">
        {/* All button */}
        <button
          className={`filter-button ${allVisible ? 'active' : 'inactive'} ${allVisible ? 'only-visible' : ''}`}
          onClick={showAllCategories}
          style={{
            borderColor: allVisible 
              ? 'rgba(255, 255, 255, 0.5)'
              : 'rgba(255, 255, 255, 0.1)',
            backgroundColor: allVisible 
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(255, 255, 255, 0.05)',
            color: allVisible 
              ? '#fff'
              : 'rgba(255, 255, 255, 0.7)',
            fontWeight: allVisible ? '600' : '500'
          }}
        >
          <span>All</span>
          {totalReservations > 0 && (
            <span 
              className="filter-count"
              style={{
                backgroundColor: allVisible 
                  ? '#fff'
                  : 'rgba(255, 255, 255, 0.6)',
                color: allVisible ? '#000' : '#000'
              }}
            >
              {totalReservations}
            </span>
          )}
        </button>

        {categoryOrder.map((category) => {
          const counts = getCategoryCounts(category);
          const displayName = getCategoryDisplayName(category);
          const isVisible = visibleCategories.has(category);
          const primaryColor = tableColors[category] || "#4a90e2";
          
          // Get theme colors for this category if available
          const getThemeColorsForCategory = () => {
            if (layoutConfig?.categoryThemeColors && layoutConfig?.categoryAreaNames) {
              const categoryCode = Object.entries(layoutConfig.categoryAreaNames)
                .find(([code, name]) => name === category)?.[0];
              
              if (categoryCode && layoutConfig.categoryThemeColors[categoryCode]) {
                return layoutConfig.categoryThemeColors[categoryCode];
              }
            }
            return null;
          };

          const themeColors = getThemeColorsForCategory();
          const totalCount = counts.accepted + counts.pending;

          const isOnlyVisible = visibleCategories.size === 1 && isVisible;

          return (
            <button
              key={category}
              className={`filter-button ${isVisible ? 'active' : 'inactive'} ${isOnlyVisible ? 'only-visible' : ''}`}
              onClick={() => toggleCategoryVisibility(category)}
              style={{
                borderColor: isVisible 
                  ? `${themeColors?.accent || primaryColor}60`
                  : `rgba(255, 255, 255, 0.1)`,
                backgroundColor: isVisible 
                  ? `${themeColors?.accent || primaryColor}15`
                  : `rgba(255, 255, 255, 0.05)`,
                color: isVisible 
                  ? `${themeColors?.accent || primaryColor}`
                  : `rgba(255, 255, 255, 0.7)`,
                boxShadow: isOnlyVisible 
                  ? `0 0 0 2px ${themeColors?.accent || primaryColor}40, 0 2px 8px rgba(0,0,0,0.3)`
                  : undefined
              }}
            >
              <span>{displayName}</span>
              {totalCount > 0 && (
                <span 
                  className="filter-count"
                  style={{
                    backgroundColor: isVisible 
                      ? (themeColors?.accent || primaryColor)
                      : 'rgba(255, 255, 255, 0.6)',
                    color: isVisible ? '#fff' : '#000'
                  }}
                >
                  {totalCount}
                </span>
              )}
            </button>
          );
        })}
        
        {/* Reload button */}
        <button
          className={`filter-button reload-button ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={isSpinning}
          title="Refresh Data"
          style={{
            marginLeft: '0.5rem',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: '40px',
            justifyContent: 'center'
          }}
        >
          <RiRefreshLine className={isSpinning ? 'spinning' : ''} />
        </button>
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
        <>
          {renderFilterBar()}
          <div className="reservations-list">
            {categoryOrder.map((category) => {
              const categoryItems = codesByCategory[category];
              const isVisible = visibleCategories.has(category);

              return categoryItems?.length > 0 && isVisible ? (
                <div key={category} className="table-category">
                  {renderCategoryTitle(category)}
                  {categoryItems.map((code) => renderCodeItem(code))}
                </div>
              ) : null;
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TableCodeManagement;
