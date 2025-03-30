// TableSystem.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
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
  counts = { tableCounts: [] },
}) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [localCounts, setLocalCounts] = useState({ tableCounts: [] });

  // Updated table categories
  const tableCategories = {
    djarea: ["B1", "B2", "B3", "B4", "B5"],
    backstage: ["P1", "P2", "P3", "P4", "P5", "P6", "E1", "E2"],
    vip: ["A1", "A2", "A3", "F1", "F2", "F3", "F4", "R1"],
    premium: ["K1", "K2", "K3", "K4"],
  };

  // Set up data interval for API calls
  const [dataInterval, setDataInterval] = useState({
    startDate: new Date(),
    endDate: new Date(),
  });

  // Update data interval when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      const eventDate = selectedEvent.startDate
        ? new Date(selectedEvent.startDate)
        : selectedEvent.date
        ? new Date(selectedEvent.date)
        : new Date();

      // Set start date to the beginning of the day
      const startDate = new Date(eventDate);
      startDate.setHours(0, 0, 0, 0);

      // Set end date to the end of the day
      const endDate = new Date(eventDate);
      endDate.setHours(23, 59, 59, 999);

      setDataInterval({ startDate, endDate });

      // Fetch table counts for this event
      fetchTableCounts(selectedEvent._id);
    }
  }, [selectedEvent]);

  // Fetch table counts for the event
  const fetchTableCounts = async (eventId) => {
    try {
      console.log(`Fetching table counts for event: ${eventId}`);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/table/counts/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data && response.data.tableCounts) {
        console.log(
          `Successfully fetched ${response.data.tableCounts.length} table counts`
        );
        setLocalCounts(response.data);
      } else {
        console.log("No table counts found in the response");
        setLocalCounts({ tableCounts: [] });
      }
    } catch (error) {
      console.error("Error fetching table counts:", error);
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
      // Fallback to empty counts
      setLocalCounts({ tableCounts: [] });
    }
  };

  // Compute total tables
  const totalTables = Object.values(tableCategories).reduce(
    (sum, tables) => sum + tables.length,
    0
  );

  // Compute number of booked tables - use localCounts as primary, fallback to props counts
  const allTableCounts =
    localCounts?.tableCounts?.length > 0
      ? localCounts.tableCounts
      : counts?.tableCounts || [];

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

  const getTableType = (tableNumber) => {
    if (tableCategories.backstage.includes(tableNumber)) return "Backstage";
    if (tableCategories.vip.includes(tableNumber)) return "VIP";
    if (tableCategories.premium.includes(tableNumber)) return "Premium";
    return "";
  };

  const handleTableSelection = (table, position) => {
    const tableType = getTableType(table);
    setSelectedTable(table); // Just store the table number
    setTableNumber(table); // Keep this for the visual selection
    setPopupPosition(position);
    setIsPopupOpen(true);
  };

  const handleBookingSubmit = async ({ name, pax }) => {
    if (!selectedEvent) {
      toast.error("Please select an event first.");
      return;
    }

    if (!name || !pax || !selectedTable) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (remainingTables <= 0) {
      toast.error("All tables have been booked.");
      return;
    }

    const isBackstageTable = tableCategories.backstage.includes(selectedTable);

    setIsSubmitting(true);
    toast.loading(
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

      toast.dismiss();
      toast.success(
        user.isAdmin
          ? "Table reservation booked successfully!"
          : "Table reservation request submitted!"
      );

      setIsSubmitting(false);
      setIsPopupOpen(false);
      setSelectedTable(null);

      // Refresh counts to get updated table counts
      refreshCounts();
      fetchTableCounts(selectedEvent._id);

      // Force refresh to tableCodeManagement
      setRefreshTrigger((prev) => prev + 1);

      // Scroll to TableCodeManagement after successful booking
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
      toast.error("Error submitting table reservation request.");
      setIsSubmitting(false);
    }
  };

  const isTableBooked = (table) => {
    return allTableCounts.some(
      (code) =>
        code.table === table &&
        code.status !== "declined" &&
        code.status !== "cancelled"
    );
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    setRefreshTrigger((prev) => prev + 1);

    if (selectedEvent && selectedEvent._id) {
      fetchTableCounts(selectedEvent._id);
    }

    // Refresh counts to get updated table counts from parent
    refreshCounts();

    // Reset spinning state after animation completes
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000); // Match this with your animation duration
  };

  if (!selectedEvent) {
    return (
      <div className="table-system">
        <div className="table-system-wrapper">
          <Toaster />
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
        <Toaster />
        <Navigation onBack={onClose} />

        <div className="table-system-content">
          <h1 className="table-system-title">Table Booking</h1>

          <div className="table-system-count">
            <h4>Remaining Tables</h4>
            <div className="table-system-count-number">
              <p>{remainingTables}</p>
            </div>
          </div>

          {/* Table Reservation Form */}
          <div className="table-system-form">
            <TableBookingPopup
              isOpen={isPopupOpen}
              onClose={() => {
                setIsPopupOpen(false);
                setSelectedTable(null);
              }}
              tableNumber={selectedTable}
              onSubmit={handleBookingSubmit}
              position={popupPosition}
              isAdmin={user.isAdmin}
              isSubmitting={isSubmitting}
            />
            <TableLayout
              counts={{ tableCounts: allTableCounts }}
              tableNumber={tableNumber}
              setTableNumber={handleTableSelection}
            />
          </div>

          <div className="refresh-button">
            <button
              onClick={handleRefresh}
              title="Refresh Data"
              className={isSpinning ? "spinning" : ""}
              disabled={isSpinning}
            >
              <img src="/image/reload-icon.svg" alt="Refresh" />
            </button>
          </div>

          {/* Table Reservations List */}
          <TableCodeManagement
            user={user}
            refreshCounts={refreshCounts}
            dataInterval={dataInterval}
            tableCategories={tableCategories}
            refreshTrigger={refreshTrigger}
            selectedEvent={selectedEvent}
            counts={{ tableCounts: allTableCounts }}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default TableSystem;
