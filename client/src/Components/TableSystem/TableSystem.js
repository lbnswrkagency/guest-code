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
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  dataInterval,
  isStartingEvent,
  counts,
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
  // Updated table categories
  const tableCategories = {
    backstage: [
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
    ],
    vip: ["A1", "A2", "A3", "F1", "F2", "F3", "F4"],
    premium: ["K1", "K2", "K3", "K4"],
  };

  // Compute total tables
  const totalTables = Object.values(tableCategories).reduce(
    (sum, tables) => sum + tables.length,
    0
  );

  // Compute number of booked tables
  const bookedTables = counts.tableCounts.filter(
    (code) => code.status !== "declined" && code.status !== "cancelled"
  );

  const uniqueBookedTableNumbers = [
    ...new Set(bookedTables.map((code) => code.table)),
  ];

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
        event: user.events,
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
    return counts.tableCounts.some(
      (code) =>
        code.table === table &&
        code.status !== "declined" &&
        code.status !== "cancelled"
    );
  };

  const handleTableBooking = async () => {
    if (!name || !pax || !tableNumber) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (remainingTables <= 0) {
      toast.error("All tables have been booked.");
      return;
    }

    const isBackstageTable = tableCategories.backstage.includes(tableNumber);

    setIsSubmitting(true);
    toast.loading(
      user.isAdmin
        ? "Booking table reservation..."
        : "Submitting table reservation request..."
    );

    try {
      const bookingData = {
        name,
        event: user.events,
        host: user.firstName || user.userName,
        condition: "TABLE RESERVATION",
        hostId: user._id,
        pax,
        tableNumber,
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

      setName("");
      setTableNumber("");
      setPax(1);
      setIsSubmitting(false);

      // Refresh counts to get updated table counts
      refreshCounts();

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
      }, 500); // Small delay to ensure DOM updates
    } catch (error) {
      console.error("Table booking error:", error);
      toast.error("Error submitting table reservation request.");
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    setRefreshTrigger((prev) => prev + 1);

    // Reset spinning state after animation completes
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000); // Match this with your animation duration
  };

  const displayDate = currentEventDate.format("DD MMM YYYY");

  return (
    <div className="table-system">
      <div className="table-system-wrapper">
        <Toaster />
        <Navigation onBack={onClose} />

        <h1 className="table-system-title">Table Booking</h1>

        <div className="table-navigation">
          <button
            className="table-navigation-button"
            onClick={onPrevWeek}
            disabled={isStartingEvent}
            style={{ opacity: isStartingEvent ? 0 : 1 }}
          >
            <img
              src="/image/arrow-left.svg"
              alt=""
              className="table-navigation-arrow-left"
            />
          </button>
          <p className="table-navigation-date">{displayDate}</p>
          <button className="table-navigation-button" onClick={onNextWeek}>
            <img
              src="/image/arrow-right.svg"
              alt=""
              className="table-navigation-arrow-right"
            />
          </button>
        </div>
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
            counts={counts}
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
        />
      </div>
      <Footer />
    </div>
  );
}

export default TableSystem;
