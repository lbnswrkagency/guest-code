// TableCodeManagement.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { BsPeopleFill } from "react-icons/bs";
import {
  RiRefreshLine,
  RiEditLine,
  RiMailLine,
  RiDownloadLine,
  RiEyeLine,
  RiDeleteBin6Line,
  RiCheckLine,
  RiCloseLine,
  RiRestartLine,
} from "react-icons/ri";
import "./TableCodeManagement.scss";

// Helper: extract numeric portion from table ID (e.g., "V12" → 12, "D3" → 3)
const extractTableNumber = (tableId) => {
  if (!tableId) return 0;
  const match = tableId.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

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
  effectivePermissions,
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
      const colors = {};
      Object.entries(layoutConfig.categoryAreaNames).forEach(([categoryCode, areaName]) => {
        const themeColor = layoutConfig.categoryThemeColors[categoryCode];
        if (themeColor) {
          colors[areaName] = themeColor.accent;
        }
      });
      return colors;
    }

    if (layoutConfig?.tableConfig) {
      const colors = {};
      Object.values(layoutConfig.tableConfig).forEach((tableInfo) => {
        if (tableInfo.category) {
          const areaName = layoutConfig.categoryAreaNames?.[tableInfo.category];
          if (areaName) {
            switch (tableInfo.category) {
              case "D":
                colors[areaName] = "#ffd700";
                break;
              case "V":
                colors[areaName] = "#1b5e20";
                break;
              case "U":
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

    return {
      djarea: "#ffd700",
      backstage: "#80221c",
      vip: "#1b5e20",
      premium: "#4a90e2",
      standing: "#0f3460",
      "Standing": "#0f3460",
      "Standing Backstage": "#b8860b",
      "VIP": "#b8860b",
      "Backstage": "#d4af37",
      "Exclusive Backstage": "#ffd700",
    };
  };

  const tableColors = getTableColors();

  // Dynamic category order based on layout config
  const categoryOrder = useMemo(() => {
    if (layoutConfig?.categoryAreaNames) {
      return Object.values(layoutConfig.categoryAreaNames);
    }
    if (tableCategories) {
      return Object.keys(tableCategories);
    }
    return ["djarea", "backstage", "vip", "premium"];
  }, [layoutConfig, tableCategories]);

  // Helper to get tables for a category
  const getTablesForCategory = useCallback((category) => {
    if (!tableCategories || !category) return [];

    if (tableCategories[category]) {
      return tableCategories[category];
    }

    const lowercaseCategory = category.toLowerCase();
    if (tableCategories[lowercaseCategory]) {
      return tableCategories[lowercaseCategory];
    }

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

    const perms = effectivePermissions ||
                  selectedEvent?.coHostBrandInfo?.effectivePermissions;

    if (perms?.tables) {
      hasTableAccess = perms.tables.access === true;
      hasTableManage = perms.tables.manage === true;
    } else {
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

  // Dynamic category mapping function
  const getCategoryForTable = useMemo(() => {
    return (tableNumber) => {
      if (!tableNumber) return "unknown";

      if (layoutConfig && layoutConfig.tableConfig && layoutConfig.categoryAreaNames) {
        const tableInfo = layoutConfig.tableConfig[tableNumber];
        if (tableInfo && tableInfo.category) {
          const areaName = layoutConfig.categoryAreaNames[tableInfo.category];
          if (areaName) {
            return areaName;
          }
        }
      }

      if (tableCategories) {
        for (const [category, tables] of Object.entries(tableCategories)) {
          if (tables.includes(tableNumber)) {
            return category;
          }
        }
      }

      const prefix = tableNumber.charAt(0);
      if (prefix === "D") return "DJ Area";
      if (prefix === "V") return "VIP Lounge";
      if (prefix === "U") return "Upstairs";
      if (prefix === "B") return "DJ Area";
      if (prefix === "A" || prefix === "R") return "VIP";
      if (prefix === "F") return "Premium";
      if (prefix === "K") return "Premium";

      return "General";
    };
  }, [layoutConfig, tableCategories]);

  // Toggle category visibility
  const toggleCategoryVisibility = (category) => {
    const isOnlyVisible = visibleCategories.size === 1 && visibleCategories.has(category);

    if (isOnlyVisible) {
      setVisibleCategories(new Set(categoryOrder));
    } else {
      setVisibleCategories(new Set([category]));
    }
  };

  // Get display name for category
  const getCategoryDisplayName = (category) => {
    if (layoutConfig && category) {
      switch (category) {
        case "backstage":
          return "Dancefloor";
        case "vip":
          return "VIP Booth";
        case "premium":
          return "Front Row";
        case "djarea":
          return "DJ Area";
        default:
          break;
      }
    }
    if (category === "djarea") return "DJ Area";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  useEffect(() => {
    const allCodes = counts?.tableCounts || [];

    // Group codes by category, then sort each group by table number numerically
    const groupedCodes = categoryOrder.reduce((acc, category) => {
      const filtered = allCodes.filter(
        (code) => getCategoryForTable(code.tableNumber) === category
      );
      // Sort by extracted numeric portion of table ID
      filtered.sort((a, b) => extractTableNumber(a.tableNumber) - extractTableNumber(b.tableNumber));
      acc[category] = filtered;
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

        const code = allCodes.find((c) => c._id === cancelCodeId);
        const isPublicRequest = code?.isPublic === true;

        await axiosInstance.put(`/code/table/status/${cancelCodeId}`, {
          status: "cancelled",
        });

        if (isPublicRequest && code.email) {
          try {
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

      const code = allCodes.find((c) => c._id === codeId);
      const isPublicRequest = code?.isPublic === true;

      await axiosInstance.put(`/code/table/status/${codeId}`, {
        status: newStatus,
      });

      if (newStatus === "confirmed" && isPublicRequest && code.email) {
        try {
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
      } else if (newStatus === "declined" && isPublicRequest && code.email) {
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

  const handleToggleFree = async (codeId, currentIsFree) => {
    setIsLoading(true);
    try {
      await axiosInstance.put(`/code/table/edit/${codeId}`, {
        isFree: !currentIsFree,
      });
      toast.showSuccess(`Table marked as ${!currentIsFree ? "free" : "not free"}`);
      triggerRefresh();
    } catch (error) {
      console.error("Error toggling free status:", error);
      toast.showError("Failed to update free status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNoMinimumSpend = async (codeId, currentValue) => {
    setIsLoading(true);
    try {
      await axiosInstance.put(`/code/table/edit/${codeId}`, {
        noMinimumSpend: !currentValue,
      });
      toast.showSuccess(`Table marked as ${!currentValue ? "no minimum spend" : "minimum spend required"}`);
      triggerRefresh();
    } catch (error) {
      console.error("Error toggling no minimum spend:", error);
      toast.showError("Failed to update minimum spend status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeView = async (codeId) => {
    try {
      setIsLoading(true);
      const loadingToast = toast.showLoading("Preparing your table code...");
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

      const originalCode = allCodes.find((c) => c._id === editCodeId);
      const hasChanges =
        originalCode.name !== editName ||
        originalCode.pax != editPax ||
        originalCode.tableNumber !== editTableNumber;

      if (!hasChanges) {
        loadingToast.dismiss();
        toast.showInfo("No changes detected");
        setEditCodeId(null);
        resetEditFields();
        return;
      }

      await axiosInstance.put(`/code/table/edit/${editCodeId}`, {
        name: editName,
        pax: editPax,
        tableNumber: editTableNumber,
      });

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

    let totalTablesInCategory = 0;

    if (layoutConfig && layoutConfig.tableConfig && layoutConfig.categoryAreaNames) {
      Object.entries(layoutConfig.tableConfig).forEach(([tableNumber, tableInfo]) => {
        if (tableInfo.category && layoutConfig.categoryAreaNames[tableInfo.category] === category) {
          totalTablesInCategory++;
        }
      });
    } else if (tableCategories) {
      const categoryKey = (() => {
        if (tableCategories[category]) {
          return category;
        }
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
    const catCounts = getCategoryCounts(category);
    const displayName = getCategoryDisplayName(category);

    return (
      <div className="category-header">
        <h3>
          <span className="category-accent" />
          <span className="category-name">{displayName}</span>
          <div className="category-counts">
            {tablePermissions.manage ? (
              <>
                {catCounts.pending > 0 && (
                  <span className="count-pending">
                    {catCounts.pending} Pending
                  </span>
                )}
                <span className="count-total">
                  {catCounts.accepted}/{catCounts.total} Reserved
                </span>
              </>
            ) : (
              <span className="count-total">
                {catCounts.accepted}/{catCounts.total} Confirmed
              </span>
            )}
          </div>
        </h3>
      </div>
    );
  };

  const renderCodeItem = (code) => {
    const isEditing = editCodeId === code._id;
    const isPublicRequest = code.isPublic === true;

    // Get table config for maximum persons setting
    let maxPersons = 10;
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
      <motion.div
        key={code._id}
        className={`code-card ${code.status} ${
          code.paxChecked > 0 ? "checked-in" : ""
        } ${isEditing ? "editing" : ""} ${
          isPublicRequest ? "public-request" : ""
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        layout
      >
        <div className="card-main">
          <div
            className={`table-icon ${isEditing ? "editing-dropdown" : ""}`}
          >
            {isEditing ? (
              <div className="table-select-inline-wrapper">
                <select
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  className="table-select-inline"
                  aria-label="Change table number"
                >
                  {categoryOrder.map((cat) => {
                    const tables = getTablesForCategory(cat);
                    return tables.length > 0 ? (
                      <optgroup
                        key={cat}
                        label={getCategoryDisplayName(cat)}
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

          <div className="code-info">
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
              <h4>{code.name}</h4>
            )}
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
            <div className="code-meta">
              {isPublicRequest ? "Public Request" : `Host: ${code.host}`}
            </div>
            <span className={`status-badge ${code.status}`}>
              {code.status}
            </span>
            {code.isFree && <span className="free-badge">FREE</span>}
            {code.noMinimumSpend && <span className="no-min-badge">NO MIN</span>}
          </div>

          <div className="card-right">
            <div className="pax-badge">
              <BsPeopleFill />
              <span className="pax-checked">
                {code.paxChecked > 0 ? code.paxChecked : 0}
              </span>
              <span className="pax-separator">/</span>
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
                <span className="pax-max">{code.pax}</span>
              )}
            </div>
            {tablePermissions.manage && code.status === "confirmed" && (
              <div className="toggle-group">
                <label className="free-toggle" title="Mark as Free">
                  <input
                    type="checkbox"
                    checked={code.isFree || false}
                    onChange={() => handleToggleFree(code._id, code.isFree)}
                    disabled={isLoading}
                  />
                  <span className="free-toggle-label">Free</span>
                </label>
                <label className="no-min-toggle" title="No Minimum Spend">
                  <input
                    type="checkbox"
                    checked={code.noMinimumSpend || false}
                    onChange={() => handleToggleNoMinimumSpend(code._id, code.noMinimumSpend)}
                    disabled={isLoading}
                  />
                  <span className="no-min-toggle-label">No Min</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="card-actions">
          {isEditing ? (
            <>
              <button
                className="action-btn save"
                onClick={handleEdit}
                title="Save"
                disabled={isLoading}
              >
                <RiCheckLine />
              </button>
              <button
                className="action-btn cancel"
                onClick={resetEditFields}
                title="Cancel"
                disabled={isLoading}
              >
                <RiCloseLine />
              </button>
            </>
          ) : (
            <>
              {tablePermissions.manage ? (
                <>
                  {code.status === "pending" && (
                    <>
                      <button
                        className="action-btn confirm"
                        onClick={() =>
                          handleStatusChange(code._id, "confirmed")
                        }
                        title="Confirm"
                        disabled={isLoading}
                      >
                        <RiCheckLine />
                      </button>
                      <button
                        className="action-btn decline"
                        onClick={() =>
                          handleStatusChange(code._id, "declined")
                        }
                        title="Decline"
                        disabled={isLoading}
                      >
                        <RiCloseLine />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                        disabled={isLoading}
                      >
                        <RiEditLine />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                        disabled={isLoading}
                      >
                        <RiDeleteBin6Line />
                      </button>
                    </>
                  )}
                  {code.status === "confirmed" && (
                    <>
                      <button
                        className="action-btn email"
                        onClick={() => handleSendEmail(code._id)}
                        title="Send Email"
                        disabled={isLoading}
                      >
                        <RiMailLine />
                      </button>
                      <button
                        className="action-btn download"
                        onClick={() => handleDownload(code._id)}
                        title="Download"
                        disabled={isLoading}
                      >
                        <RiDownloadLine />
                      </button>
                      <button
                        className="action-btn view"
                        onClick={() => handleCodeView(code._id)}
                        title="View QR"
                        disabled={isLoading}
                      >
                        <RiEyeLine />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => startEdit(code)}
                        title="Edit"
                        disabled={isLoading}
                      >
                        <RiEditLine />
                      </button>
                      <button
                        className="action-btn cancel-action"
                        onClick={() => handleCancelClick(code._id)}
                        title="Cancel Reservation"
                        disabled={isLoading}
                      >
                        <RiCloseLine />
                      </button>
                    </>
                  )}
                  {["declined", "cancelled"].includes(code.status) && (
                    <>
                      <button
                        className="action-btn reset"
                        onClick={() =>
                          handleStatusChange(code._id, "pending")
                        }
                        title="Reset to Pending"
                        disabled={isLoading}
                      >
                        <RiRestartLine />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(code._id)}
                        title="Delete"
                        disabled={isLoading}
                      >
                        <RiDeleteBin6Line />
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
                            className="action-btn edit"
                            onClick={() => startEdit(code)}
                            title="Edit"
                            disabled={isLoading}
                          >
                            <RiEditLine />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteClick(code._id)}
                            title="Delete"
                            disabled={isLoading}
                          >
                            <RiDeleteBin6Line />
                          </button>
                        </>
                      )}
                      {code.status === "confirmed" && (
                        <>
                          <button
                            className="action-btn email"
                            onClick={() => handleSendEmail(code._id)}
                            title="Send Email"
                            disabled={isLoading}
                          >
                            <RiMailLine />
                          </button>
                          <button
                            className="action-btn download"
                            onClick={() => handleDownload(code._id)}
                            title="Download"
                            disabled={isLoading}
                          >
                            <RiDownloadLine />
                          </button>
                          <button
                            className="action-btn view"
                            onClick={() => handleCodeView(code._id)}
                            title="View QR"
                            disabled={isLoading}
                          >
                            <RiEyeLine />
                          </button>
                          <button
                            className="action-btn edit"
                            onClick={() => startEdit(code)}
                            title="Edit"
                            disabled={isLoading}
                          >
                            <RiEditLine />
                          </button>
                          <button
                            className="action-btn cancel-action"
                            onClick={() => handleCancelClick(code._id)}
                            title="Cancel Reservation"
                            disabled={isLoading}
                          >
                            <RiCloseLine />
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
      </motion.div>
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
      const catCounts = getCategoryCounts(category);
      return sum + catCounts.accepted + catCounts.pending;
    }, 0);

    return (
      <div className="category-filter-tabs">
        <button
          className={`filter-tab ${allVisible ? 'active' : ''}`}
          onClick={showAllCategories}
        >
          All{totalReservations > 0 && (
            <span className="filter-count">{totalReservations}</span>
          )}
        </button>

        {categoryOrder.map((category) => {
          const catCounts = getCategoryCounts(category);
          const displayName = getCategoryDisplayName(category);
          const isVisible = visibleCategories.has(category);
          const totalCount = catCounts.accepted + catCounts.pending;
          const isOnlyVisible = visibleCategories.size === 1 && isVisible;

          return (
            <button
              key={category}
              className={`filter-tab ${isVisible ? 'active' : ''} ${isOnlyVisible ? 'only-visible' : ''}`}
              onClick={() => toggleCategoryVisibility(category)}
            >
              {displayName}{totalCount > 0 && (
                <span className="filter-count">{totalCount}</span>
              )}
            </button>
          );
        })}

        <button
          className={`reload-tab ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={isSpinning}
          title="Refresh Data"
        >
          <RiRefreshLine />
        </button>
      </div>
    );
  };

  return (
    <div className="table-code-management">
      {/* PNG View Modal */}
      <AnimatePresence>
        {showPngModal && (
          <motion.div
            className="png-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPngModal(false)}
          >
            <button className="close-btn" onClick={() => setShowPngModal(false)}>
              <RiCloseLine />
            </button>
            <div className="png-container" onClick={(e) => e.stopPropagation()}>
              <img src={pngUrl} alt="Table Code" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Email Modal */}
      <AnimatePresence>
        {showSendEmailModal && (
          <motion.div
            className="email-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSendEmailModal(false)}
          >
            <motion.div
              className="email-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setShowSendEmailModal(false)}
              >
                <RiCloseLine />
              </button>
              <h3>Send Invitation</h3>
              <div className="email-form">
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  disabled={isSendingEmail}
                  autoFocus
                />
                <button
                  className="send-btn"
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail || !emailRecipient}
                >
                  {isSendingEmail ? "Sending..." : "Send"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            className="delete-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmDelete(false)}
          >
            <motion.div
              className="delete-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete Reservation</h3>
              <p>Are you sure you want to delete this reservation?</p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button className="delete-btn" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showConfirmCancel && (
          <motion.div
            className="delete-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmCancel(false)}
          >
            <motion.div
              className="delete-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Cancel Reservation</h3>
              <p>Are you sure you want to cancel this reservation?</p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmCancel(false)}
                >
                  Close
                </button>
                <button className="delete-btn" onClick={confirmCancel}>
                  Cancel Reservation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <AnimatePresence mode="popLayout">
                    {categoryItems.map((code) => renderCodeItem(code))}
                  </AnimatePresence>
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
