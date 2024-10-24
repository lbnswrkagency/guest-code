// TableSystem.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./TableSystem.scss";
import TableLayout from "../TableLayout/TableLayout";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import TableCodeManagement from "../TableCodeManagement/TableCodeManagement";

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

  const handleTableSelection = (table) => {
    setTableNumber(table);
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
    } catch (error) {
      console.error("Table booking error:", error);
      toast.error("Error submitting table reservation request.");
      setIsSubmitting(false);
    }
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
          <div className="input-group">
            <input
              id="name"
              className="table-system-input"
              placeholder="Enter guest name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <select
              className="table-system-select"
              value={pax}
              onChange={(e) => setPax(parseInt(e.target.value))}
            >
              {[...Array(5)].map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} People
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <select
              className="table-system-select"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            >
              <option value="">Select a table</option>
              {Object.entries(tableCategories).map(([category, tables]) => (
                <optgroup key={category} label={category.toUpperCase()}>
                  {tables.map((table) => {
                    const booked = isTableBooked(table);
                    return (
                      <option
                        key={table}
                        value={table}
                        disabled={booked}
                        style={
                          booked
                            ? { color: "#666", backgroundColor: "#1a1a1a" }
                            : {}
                        }
                      >
                        {table} {booked ? "(Unavailable)" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            className="table-system-btn"
            onClick={handleTableBooking}
            disabled={isSubmitting || !name || !tableNumber}
          >
            {isSubmitting
              ? user.isAdmin
                ? "Booking..."
                : "Submitting..."
              : user.isAdmin
              ? "Book Reservation"
              : "Request Reservation"}
          </button>

          <TableLayout
            counts={counts}
            tableNumber={tableNumber}
            setTableNumber={handleTableSelection}
          />
        </div>

        {/* Table Reservations List */}
        <TableCodeManagement
          user={user}
          refreshCounts={refreshCounts}
          dataInterval={dataInterval}
          tableCategories={tableCategories}
        />
      </div>
      <Footer />
    </div>
  );
}

export default TableSystem;
