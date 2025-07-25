// TableSystem.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import axiosInstance from "../../utils/axiosConfig"; // Import configured axiosInstance
import { useToast } from "../Toast/ToastContext";
import "./TableSystem.scss";
import TableLayoutStudio from "../TableLayoutStudio/TableLayoutStudio";
import TableLayoutBolivar from "../TableLayoutBolivar/TableLayoutBolivar";
import TableLayoutVenti from "../TableLayoutVenti/TableLayoutVenti";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import TableCodeManagement from "../TableCodeManagement/TableCodeManagement";
import TableBookingPopup from "../TableBookingPopup/TableBookingPopup";
import { RiTableLine, RiRefreshLine, RiCloseLine } from "react-icons/ri";

/**
 * TableSystem component for managing table reservations
 * 
 * HYBRID COMPONENT: Can work in two modes:
 * 1. Standalone mode (DashboardMenu): Fetches its own table data via API calls
 * 2. Optimized mode (UpcomingEvent): Uses pre-fetched table data from comprehensive endpoint
 * 
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {Array} props.userRoles - User's roles for permissions
 * @param {Function} props.onClose - Function to call when closing component
 * @param {Function} props.refreshCounts - Function to trigger parent refresh
 * @param {Object} props.selectedEvent - Selected event object
 * @param {Object} props.selectedBrand - Selected brand object
 * @param {boolean} props.isPublic - Whether this is public-facing or admin
 * @param {Object} props.tableData - Pre-fetched table data (optional, for optimization)
 */
function TableSystem({
  user,
  userRoles = [],
  onClose,
  refreshCounts,
  selectedEvent,
  selectedBrand,
  isPublic = false,
  tableData: providedTableData, // Pre-fetched table data (optional)
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(providedTableData || {
    tableCounts: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(!providedTableData);
  const [selectedVenue, setSelectedVenue] = useState("default");

  // Dynamic table configuration
  const [layoutConfig, setLayoutConfig] = useState(null);
  // Use ref to track if config was loaded to prevent multiple loads
  const configLoadedRef = useRef(false);

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

  // Determine which layout to use based on event's tableLayout field
  const getSelectedLayout = () => {
    if (selectedEvent?.tableLayout && selectedEvent.tableLayout !== "") {
      return selectedEvent.tableLayout;
    }
    // Return null if no layout is selected
    return null;
  };

  const selectedLayout = getSelectedLayout();

  // Default table categories as fallback based on selected layout
  const getDefaultTableCategories = () => {
    switch (selectedLayout) {
      case "bolivar":
        return {
          djarea: ["B1", "B2", "B3", "B4", "B5"],
          backstage: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "E1", "E2"],
          vip: ["A1", "A2", "A3", "F1", "F2", "F3", "F4", "R1"],
          premium: ["K1", "K2", "K3", "K4"],
        };
      case "venti":
        return {
          basic: ["A1", "A2", "A3", "A4", "A5", "A6"],
          djarea: ["B1", "B2", "B3", "B4", "B5"],
          vip: ["V1", "V2", "V3", "V4"],
          premium: ["P1", "P2", "P3"],
        };
      case "studio":
      default:
        return {
          djarea: ["B1", "B2", "B3", "B4", "B5"],
          backstage: ["P1", "P2", "P3", "P4", "P5", "P6", "E1", "E2"],
          vip: ["A1", "A2", "A3", "F1", "F2", "F3", "F4", "R1"],
          premium: ["K1", "K2", "K3", "K4"],
        };
    }
  };

  const defaultTableCategories = getDefaultTableCategories();

  // Use dynamic table categories from layout if available
  const tableCategories =
    layoutConfig?.tableCategories || defaultTableCategories;

  // Function to render the appropriate table layout component
  const renderTableLayout = () => {
    // If no layout is selected, don't render anything
    if (!selectedLayout) {
      return null;
    }

    const layoutProps = {
      counts: tableData,
      tableNumber: tableNumber,
      setTableNumber: handleTableSelection,
      refreshTrigger: refreshTrigger,
      onConfigurationLoaded: handleConfigurationLoaded,
    };

    switch (selectedLayout) {
      case "bolivar":
        return <TableLayoutBolivar {...layoutProps} />;
      case "venti":
        return <TableLayoutVenti {...layoutProps} />;
      case "studio":
        return <TableLayoutStudio {...layoutProps} />;
      default:
        return <TableLayoutStudio {...layoutProps} />;
    }
  };

  // Handler for receiving configuration from layout components - memoize to prevent infinite loop
  const handleConfigurationLoaded = useCallback(
    (config) => {
      // Only update if the config is different to prevent render loops
      if (JSON.stringify(layoutConfig) !== JSON.stringify(config)) {
        setLayoutConfig(config);
      }
    },
    [layoutConfig]
  );

  // Reset config loaded flag when event changes
  useEffect(() => {
    configLoadedRef.current = false;
  }, [selectedEvent]);

  // Fetch table counts when selectedEvent changes or refresh is triggered
  useEffect(() => {
    // If table data is provided as props, use it instead of fetching
    if (providedTableData && providedTableData.tableCounts) {
      setTableData(providedTableData);
      setIsLoading(false);
      return;
    }

    if (selectedEvent && selectedEvent._id) {
      fetchTableCounts(selectedEvent._id);
    }
  }, [selectedEvent, refreshTrigger, providedTableData]);

  // Handle changes to providedTableData prop
  useEffect(() => {
    if (providedTableData) {
      setTableData(providedTableData);
      setIsLoading(false);
    }
  }, [providedTableData]);

  // Set up event listener for table count updates triggered by children
  useEffect(() => {
    const handleTableCountUpdate = (event) => {
      // Force a refresh when a child component modifies data
      setRefreshTrigger((prev) => prev + 1);
      // Optionally notify parent if needed
      if (refreshCounts) {
        refreshCounts();
      }
    };

    window.addEventListener("tableCountUpdated", handleTableCountUpdate);
    return () => {
      window.removeEventListener("tableCountUpdated", handleTableCountUpdate);
    };
  }, [refreshCounts]);

  // Fetch table counts for the event using the new endpoint
  const fetchTableCounts = async (eventId) => {
    setIsLoading(true);
    try {
      // Use different endpoint for public vs. authenticated requests
      const endpoint = isPublic
        ? `/table/public/counts/${eventId}`
        : `/table/counts/${eventId}`;

      // Use axiosInstance with token refresh interceptors for authenticated requests
      // Keep direct axios for public requests
      const response = isPublic
        ? await axios.get(`${process.env.REACT_APP_API_BASE_URL}${endpoint}`)
        : await axiosInstance.get(endpoint);

      // Expecting response format { tableCounts: [], totalCount: 0 }
      if (response.data && Array.isArray(response.data.tableCounts)) {
        const { tableCounts, totalCount } = response.data;
        setTableData({ tableCounts, totalCount });
      } else {
        setTableData({ tableCounts: [], totalCount: 0 });
      }
    } catch (error) {
      // Detailed error logging
      if (error.response) {
        // Response error
      } else if (error.request) {
        // Request error
      } else {
        // Error message
      }
      toast.showError("Failed to load table reservations.");
      setTableData({ tableCounts: [], totalCount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Compute total tables - use dynamic config if available
  const totalTables =
    layoutConfig?.totalTables ||
    Object.values(tableCategories).reduce(
      (sum, tables) => sum + tables.length,
      0
    );

  // Use the centralized tableData state
  const allTableCounts = tableData.tableCounts || [];

  // Filter table counts to only include active tables (not declined or cancelled)
  const bookedTables = allTableCounts.filter(
    (code) => code.status !== "declined" && code.status !== "cancelled"
  );

  // Extract unique table numbers from booked tables
  const uniqueBookedTableNumbers = [
    ...new Set(bookedTables.map((code) => code.tableNumber)),
  ];

  // Calculate remaining tables
  const remainingTables = totalTables - uniqueBookedTableNumbers.length;

  // Dynamic function to get table type based on active layout
  const getTableType = (table) => {
    if (!table) return "";

    // First check if we have layout configuration
    if (
      layoutConfig &&
      layoutConfig.tableConfig &&
      layoutConfig.categoryAreaNames
    ) {
      const tableInfo = layoutConfig.tableConfig[table];
      if (tableInfo) {
        return layoutConfig.categoryAreaNames[tableInfo.category] || "";
      }
    }

    // Fallback to category-based mapping
    if (tableCategories.backstage.includes(table)) return "Backstage";
    if (tableCategories.vip.includes(table)) return "VIP";
    if (tableCategories.premium.includes(table)) return "Premium";
    if (tableCategories.djarea.includes(table)) return "DJ Area";
    return "General"; // Fallback category if needed
  };

  const handleTableSelection = (table, position) => {
    setSelectedTable(table);
    setTableNumber(table);

    // Determine if this is public-facing (showing advanced form)
    const isPublicFacing = isPublic;

    // Add showAdvancedForm flag to position
    const positionWithFormType = {
      ...position,
      showAdvancedForm: isPublicFacing,
    };

    setPopupPosition(positionWithFormType);
    setIsPopupOpen(true);
  };

  const handleBookingSubmit = async ({
    name,
    firstName,
    lastName,
    email,
    phone,
    pax,
    tableNumber: submittedTableNumber, // Rename to avoid confusion
  }) => {
    if (!selectedEvent) {
      toast.showError("Please select an event first.");
      return;
    }

    // Determine which table to use - prioritize the submitted one
    const tableToBook = submittedTableNumber || selectedTable || tableNumber;

    // Validate form data is present
    if (!tableToBook) {
      toast.showError("Please select a table first.");
      return;
    }

    if (!pax) {
      toast.showError("Please specify number of people.");
      return;
    }

    // Check if using simplified form based on presence of name but not firstName/lastName
    const isSimplifiedForm = Boolean(name && (!firstName || !lastName));

    if (isSimplifiedForm) {
      if (!name || name.trim() === "") {
        toast.showError("Please enter a guest name.");
        return;
      }
    } else {
      if (
        !firstName ||
        !lastName ||
        firstName.trim() === "" ||
        lastName.trim() === ""
      ) {
        toast.showError("Please enter first and last name.");
        return;
      }
    }

    // Validate email and phone if in public mode
    if (isPublic) {
      if (!email || !email.trim()) {
        toast.showError("Please enter your email address.");
        return;
      }
      if (!phone || !phone.trim()) {
        toast.showError("Please enter your phone number.");
        return;
      }
    }

    if (remainingTables <= 0) {
      toast.showError("All tables have been booked.");
      return;
    }

    // Determine if this is a backstage table based on dynamic config
    let isBackstageTable = false;
    if (layoutConfig && layoutConfig.tableConfig && selectedTable) {
      const tableInfo = layoutConfig.tableConfig[selectedTable];
      if (tableInfo && tableInfo.category === "D") {
        isBackstageTable = true;
      }
    } else {
      // Fallback to static check
      isBackstageTable = tableCategories.backstage.includes(selectedTable);
    }

    setIsSubmitting(true);
    const loadingToast = toast.showLoading(
      isPublic
        ? "Submitting table reservation request..."
        : tablePermissions.manage
        ? "Booking table reservation..."
        : "Submitting table reservation request..."
    );

    try {
      const bookingData = {
        name, // Keep for backward compatibility
        firstName,
        lastName,
        email,
        phone,
        event: selectedEvent._id,
        host: isPublic ? firstName : user?.firstName || user?.userName,
        condition: "TABLE RESERVATION",
        hostId: isPublic ? null : user?._id,
        pax,
        tableNumber: selectedTable,
        backstagePass: isBackstageTable,
        paxChecked: 0,
        isPublic: isPublic, // Flag to identify public requests
      };


      // Use different endpoint for public vs. authenticated requests
      const endpoint = isPublic ? `/table/public/add` : `/table/add`;

      // Use axiosInstance with token refresh interceptors for authenticated requests
      // Keep direct axios for public requests
      if (isPublic) {
        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}${endpoint}`,
          bookingData
        );
      } else {
        await axiosInstance.post(endpoint, bookingData);
      }

      loadingToast.dismiss();

      // Show a more informative toast for public users
      if (isPublic) {
        toast.showSuccess(
          <div className="custom-toast-content">
            <h4>Thank you for your request!</h4>
            <p>
              We'll review your table reservation and send you a confirmation
              email soon.
            </p>
            <p>
              Please check your inbox at <strong>{email}</strong>
            </p>
          </div>,
          { autoClose: 15000 } // Increased from 10000 to 15000 (15 seconds)
        );
      } else if (tablePermissions.manage) {
        toast.showSuccess("Table reservation booked successfully!");
      } else {
        toast.showSuccess("Table reservation request submitted!");
      }

      setIsSubmitting(false);
      setIsPopupOpen(false);
      setSelectedTable(null);
      setTableNumber("");

      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        const tableManagement = document.querySelector(
          ".table-code-management"
        );
        if (tableManagement) {
          tableManagement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 500);
    } catch (error) {
      loadingToast.dismiss();
      toast.showError(
        error.response?.data?.message ||
          "Error submitting table reservation request."
      );
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    
    // If we have provided data, don't set refresh trigger as it won't refetch
    // Instead, just show the spinning animation and reset it
    if (providedTableData) {
      setTimeout(() => {
        setIsSpinning(false);
      }, 1000);
    } else {
      // For standalone mode, trigger a refresh
      setRefreshTrigger((prev) => prev + 1);
      setTimeout(() => {
        setIsSpinning(false);
      }, 1000);
    }
  };

  // Function to toggle between venues/layouts
  const toggleVenue = (venue) => {
    setSelectedVenue(venue);
  };

  // Add effect to ensure navigation menu works properly from this component
  useEffect(() => {
    // Function to handle navigation events from Dashboard
    const handleNavigationStateChange = (event) => {
      // Any special handling for navigation state changes if needed
    };

    // Register for navigation events
    window.addEventListener(
      "navigationStateChanged",
      handleNavigationStateChange
    );

    // Signal that this component is using Navigation
    window.dispatchEvent(
      new CustomEvent("subComponentMounted", {
        detail: { component: "TableSystem", usesNavigation: true },
      })
    );

    return () => {
      window.removeEventListener(
        "navigationStateChanged",
        handleNavigationStateChange
      );
    };
  }, []);

  // Enhance the back button to ensure it communicates with Dashboard
  const handleBack = () => {
    // Call the provided onClose handler directly without custom event
    if (onClose) onClose();
  };

  if (!selectedEvent) {
    return (
      <div className="table-system">
        <div className="table-system-wrapper">
          <Navigation onBack={onClose} />
          <div className="table-system-content">
            <h1 className="table-system-title">Table Booking</h1>
            <div className="no-event-message">
              <p>Please select an event to manage tables.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="table-system"
      style={
        isPublic ? { background: "none", paddingTop: 0, minHeight: "auto" } : {}
      }
    >
      <div className="table-system-wrapper">
        <Navigation
          onBack={onClose}
          // Menu click is handled through global events - we don't need a local handler
          onMenuClick={() => {
            // The global event is dispatched in Navigation component
          }}
        />

        <div className="table-system-content">
          {isPublic ? (
            <div className="table-booking-header">
              <div className="table-booking-title-wrapper">
                <h1 className="table-booking-title">
                  <span className="title-text">TABLE BOOKING</span>
                </h1>
                <div className="title-decoration"></div>
              </div>
            </div>
          ) : (
            <div className="tablesystem-header">
              <h1 className="tablesystem-title">
                <RiTableLine /> Table Booking
                {selectedEvent && (
                  <span className="event-name"> - {selectedEvent.title}</span>
                )}
              </h1>
              <div className="header-actions">
                <button
                  className="refresh-btn"
                  onClick={handleRefresh}
                  disabled={isSpinning || isLoading}
                >
                  <RiRefreshLine className={isSpinning ? "spinning" : ""} />
                </button>
                <button className="close-btn" onClick={onClose}>
                  <RiCloseLine />
                </button>
              </div>
            </div>
          )}

          {/* Show refresh button and table count summary only in non-public mode */}
          {!isPublic && (
            <div className="table-system-count">
              <h4>Remaining Tables</h4>
              <div className="table-system-count-number">
                <p>{isLoading ? "..." : remainingTables}</p>
              </div>
            </div>
          )}

          <div className="table-system-form">
            <TableBookingPopup
              isOpen={isPopupOpen}
              onClose={() => {
                setIsPopupOpen(false);
                setSelectedTable(null);
                setTableNumber("");
              }}
              tableNumber={selectedTable}
              onSubmit={handleBookingSubmit}
              position={popupPosition}
              isAdmin={tablePermissions.manage}
              isSubmitting={isSubmitting}
              isPublic={isPublic}
            />

            {isPublic ? (
              <div className="table-layout-frame">
                <div className="table-layout-decoration top-left"></div>
                <div className="table-layout-decoration top-right"></div>
                <div className="table-layout-decoration bottom-left"></div>
                <div className="table-layout-decoration bottom-right"></div>
                <div className="table-layout-overlay"></div>
                <div className="table-layout-instruction">
                  <span className="instruction-text">Click a Table </span>
                </div>
                <div className="table-layout-container">
                  {renderTableLayout()}
                </div>
              </div>
            ) : (
              <div className="table-layout-container">
                {renderTableLayout()}
              </div>
            )}
          </div>

          {/* Only show refresh button in non-public mode if using old refresh layout */}
          {!isPublic && !document.querySelector(".tablesystem-header") && (
            <div className="refresh-button">
              <button
                onClick={handleRefresh}
                title="Refresh Data"
                className={isSpinning ? "spinning" : ""}
                disabled={isSpinning || isLoading}
              >
                <img src="/image/reload-icon.svg" alt="Refresh" />
              </button>
            </div>
          )}

          {/* Only show TableCodeManagement in non-public mode */}
          {!isPublic && (
            <TableCodeManagement
              user={user}
              userRoles={userRoles}
              triggerRefresh={() => setRefreshTrigger((prev) => prev + 1)}
              tableCategories={tableCategories}
              layoutConfig={layoutConfig}
              refreshTrigger={refreshTrigger}
              selectedEvent={selectedEvent}
              counts={tableData}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
      {/* Only show Footer in non-public mode */}
      {!isPublic && <Footer />}
    </div>
  );
}

export default TableSystem;
