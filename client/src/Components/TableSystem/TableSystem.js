// TableSystem.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./TableSystem.scss";
import TableLayout from "../TableLayout/TableLayout";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import TableCodeManagement from "../TableCodeManagement/TableCodeManagement";
import TableBookingPopup from "../TableBookingPopup/TableBookingPopup";

function TableSystem({
  user,
  onClose,
  refreshCounts,
  selectedEvent,
  selectedBrand,
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
  const [tableData, setTableData] = useState({
    tableCounts: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Updated table categories
  const tableCategories = {
    djarea: ["B1", "B2", "B3", "B4", "B5"],
    backstage: ["P1", "P2", "P3", "P4", "P5", "P6", "E1", "E2"],
    vip: ["A1", "A2", "A3", "F1", "F2", "F3", "F4", "R1"],
    premium: ["K1", "K2", "K3", "K4"],
  };

  // Fetch table counts when selectedEvent changes or refresh is triggered
  useEffect(() => {
    if (selectedEvent && selectedEvent._id) {
      fetchTableCounts(selectedEvent._id);
    }
  }, [selectedEvent, refreshTrigger]);

  // Set up event listener for table count updates triggered by children
  useEffect(() => {
    const handleTableCountUpdate = (event) => {
      console.log(
        "Table count update event received in TableSystem:",
        event.detail
      );
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
      console.log(
        `Fetching table counts for event: ${eventId} using /table/counts`
      );
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/table/counts/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Expecting response format { tableCounts: [], totalCount: 0 }
      if (response.data && Array.isArray(response.data.tableCounts)) {
        const { tableCounts, totalCount } = response.data;
        console.log(
          `Successfully fetched ${tableCounts.length} table counts (Total: ${totalCount})`
        );
        setTableData({ tableCounts, totalCount });
      } else {
        console.log(
          "No table counts found in the response or unexpected format from /table/counts"
        );
        setTableData({ tableCounts: [], totalCount: 0 });
      }
    } catch (error) {
      console.error("Error fetching table counts from /table/counts:", error);
      // Detailed error logging
      if (error.response) {
        console.error(
          "Response error:",
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      toast.showError("Failed to load table reservations.");
      setTableData({ tableCounts: [], totalCount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Compute total tables
  const totalTables = Object.values(tableCategories).reduce(
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

  const getTableType = (table) => {
    if (!table) return "";
    if (tableCategories.backstage.includes(table)) return "Backstage";
    if (tableCategories.vip.includes(table)) return "VIP";
    if (tableCategories.premium.includes(table)) return "Premium";
    if (tableCategories.djarea.includes(table)) return "DJ Area";
    return "General"; // Fallback category if needed
  };

  const handleTableSelection = (table, position) => {
    setSelectedTable(table);
    setTableNumber(table);
    setPopupPosition(position);
    setIsPopupOpen(true);
  };

  const handleBookingSubmit = async ({ name, pax }) => {
    if (!selectedEvent) {
      toast.showError("Please select an event first.");
      return;
    }

    if (!name || !pax || !selectedTable) {
      toast.showError("Please fill in all required fields.");
      return;
    }

    if (remainingTables <= 0) {
      toast.showError("All tables have been booked.");
      return;
    }

    const isBackstageTable = tableCategories.backstage.includes(selectedTable);

    setIsSubmitting(true);
    const loadingToast = toast.showLoading(
      user.isAdmin
        ? "Booking table reservation..."
        : "Submitting table reservation request..."
    );

    try {
      const bookingData = {
        name,
        event: selectedEvent._id,
        host: user.firstName || user.userName,
        condition: "TABLE RESERVATION",
        hostId: user._id,
        pax,
        tableNumber: selectedTable,
        backstagePass: isBackstageTable,
        paxChecked: 0,
        status: user.isAdmin ? "confirmed" : "pending",
        isAdmin: user.isAdmin,
      };

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/table/add`,
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      loadingToast.dismiss();
      toast.showSuccess(
        user.isAdmin
          ? "Table reservation booked successfully!"
          : "Table reservation request submitted!"
      );

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
      console.error("Table booking error:", error);
      loadingToast.dismiss();
      toast.showError(
        error.response?.data?.message ||
          "Error submitting table reservation request."
      );
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    setIsSpinning(true);
    setRefreshTrigger((prev) => prev + 1);

    setTimeout(() => {
      setIsSpinning(false);
    }, 1000);
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
    <div className="table-system">
      <div className="table-system-wrapper">
        <Navigation onBack={onClose} />

        <div className="table-system-content">
          <h1 className="table-system-title">Table Booking</h1>

          <div className="table-system-count">
            <h4>Remaining Tables</h4>
            <div className="table-system-count-number">
              <p>{isLoading ? "..." : remainingTables}</p>
            </div>
          </div>

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
              isAdmin={user.isAdmin}
              isSubmitting={isSubmitting}
            />
            <TableLayout
              counts={tableData}
              tableNumber={tableNumber}
              setTableNumber={handleTableSelection}
              refreshTrigger={refreshTrigger}
            />
          </div>

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

          <TableCodeManagement
            user={user}
            triggerRefresh={() => setRefreshTrigger((prev) => prev + 1)}
            tableCategories={tableCategories}
            refreshTrigger={refreshTrigger}
            selectedEvent={selectedEvent}
            counts={tableData}
            isLoading={isLoading}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default TableSystem;
