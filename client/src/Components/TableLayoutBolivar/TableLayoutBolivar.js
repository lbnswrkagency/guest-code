import React, { useEffect, useRef } from "react";
import "./TableLayoutBolivar.scss";
import { RiDoorOpenLine } from "react-icons/ri";
import {
  FaMusic,
  FaGuitar,
  FaStar,
  FaHeart,
  FaRegKissWinkHeart,
  FaGrinHearts,
  FaGem,
} from "react-icons/fa";

const TableLayoutBolivar = ({
  codes,
  tableNumber,
  setTableNumber,
  counts,
  refreshTrigger,
  onConfigurationLoaded,
}) => {
  // Ref to track if config was sent to prevent multiple sends
  const configSentRef = useRef(false);

  // Table configuration with minimum spend and max persons
  const tableConfig = {
    // D tables (red tables) - €160 minimum, 5 persons max
    D1: { minSpend: 160, maxPersons: 5, category: "D" },
    D2: { minSpend: 160, maxPersons: 5, category: "D" },
    D3: { minSpend: 160, maxPersons: 5, category: "D" },
    D4: { minSpend: 160, maxPersons: 5, category: "D" },
    D5: { minSpend: 160, maxPersons: 5, category: "D" },
    D6: { minSpend: 160, maxPersons: 5, category: "D" },
    D7: { minSpend: 160, maxPersons: 5, category: "D" },

    // V tables (green tables) - €250 minimum, 5 persons max
    V1: { minSpend: 250, maxPersons: 5, category: "V" },
    V2: { minSpend: 250, maxPersons: 5, category: "V" },
    V3: { minSpend: 250, maxPersons: 5, category: "V" },
    V4: { minSpend: 250, maxPersons: 5, category: "V" },
    V5: { minSpend: 250, maxPersons: 5, category: "V" },
    V6: { minSpend: 250, maxPersons: 5, category: "V" },
    V7: { minSpend: 250, maxPersons: 5, category: "V" },
    V8: { minSpend: 250, maxPersons: 5, category: "V" },
    V9: { minSpend: 250, maxPersons: 5, category: "V" },

    // F tables (gold tables) - €500 minimum, 5 persons max
    F1: { minSpend: 500, maxPersons: 5, category: "F" },
    F2: { minSpend: 500, maxPersons: 5, category: "F" },
    F3: { minSpend: 500, maxPersons: 5, category: "F" },
    F4: { minSpend: 500, maxPersons: 5, category: "F" },
  };

  // Categorize tables for the parent components to use
  const tableCategories = {
    // Note: There are no B tables in Bolivar layout, removing from categories
    djarea: [], // Was ["B1", "B2", "B3", "B4", "B5"] but these don't exist in this layout
    backstage: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
    vip: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9"],
    premium: ["F1", "F2", "F3", "F4"],
  };

  // Category to area name mapping
  const categoryAreaNames = {
    D: "Dancefloor",
    V: "VIP Booth",
    F: "Front Row",
  };

  // Extract tableCounts from the counts object
  const tableCounts = counts?.tableCounts || [];

  // This function checks if a specific table is booked using the correct data
  const isBooked = (table) =>
    tableCounts.some(
      (code) =>
        (code.table === table || code.tableNumber === table) &&
        code.status !== "declined" &&
        code.status !== "cancelled"
    );

  // Pass configuration to parent component only once
  useEffect(() => {
    if (onConfigurationLoaded && !configSentRef.current) {
      const config = {
        tableConfig,
        tableCategories,
        categoryAreaNames,
        totalTables: Object.values(tableCategories).flat().length,
      };
      onConfigurationLoaded(config);
      configSentRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, config is static

  // Re-render when refreshTrigger or counts change
  useEffect(() => {
    // Logic to handle updates can go here if needed, but re-render is automatic
  }, [refreshTrigger, counts]); // Depend on counts object

  // Function to determine CSS classes for each table
  const getClass = (table, baseClass) => {
    let classes = `${baseClass} ${tableNumber === table ? "selected" : ""} ${
      isBooked(table) ? "table-booked" : ""
    }`;
    return classes;
  };

  const handleTableClick = (table, event) => {
    if (!isBooked(table)) {
      const rect = event.target.getBoundingClientRect();

      // Get table configuration data
      const tableData = tableConfig[table] || {
        minSpend: 0,
        maxPersons: 0,
        category: "",
      };

      // Determine area name based on table category
      const areaName = categoryAreaNames[tableData.category] || "";

      // Format display name with area
      const displayName = `${areaName} ${table}`;

      // Pass the table identifier, position, and configuration to the parent
      setTableNumber(table, {
        x: rect.left + rect.width / 2,
        y: rect.bottom,
        minSpend: tableData.minSpend,
        maxPersons: tableData.maxPersons,
        category: tableData.category,
        displayName: displayName,
        areaName: areaName,
      });
    }
  };

  return (
    <div className="table-layout-bolivar">
      <div className="table-guide">Click Table</div>

      <div className="table-beach">
        <div className="sunshine"></div>
      </div>

      {/* Table Layout 01 */}
      <div className="tables table-layout-bolivar-01">
        <div className="bar-area-backstage">
          <p>STAGE</p>
        </div>
        <div
          className={getClass("D1", "table-height red-table d1")}
          onClick={(e) => handleTableClick("D1", e)}
        >
          D1
        </div>
        <div
          className={getClass("D2", "table-height red-table d2")}
          onClick={(e) => handleTableClick("D2", e)}
        >
          D2
        </div>
        <div
          className={getClass("D3", "table-width red-table d3")}
          onClick={(e) => handleTableClick("D3", e)}
        >
          D3
        </div>
        <div
          className={getClass("D4", "table-width red-table d4")}
          onClick={(e) => handleTableClick("D4", e)}
        >
          D4
        </div>
        <div
          className={getClass("D5", "table-height red-table d5")}
          onClick={(e) => handleTableClick("D5", e)}
        >
          D5
        </div>
        <div
          className={getClass("D6", "table-height red-table d6")}
          onClick={(e) => handleTableClick("D6", e)}
        >
          D6
        </div>
        <div
          className={getClass("D7", "table-height red-table d7")}
          onClick={(e) => handleTableClick("D7", e)}
        >
          D7
        </div>
        <div className="table-dancefloor">
          <p>DANCE FLOOR</p>
          <div className="music-notes">
            <FaMusic className="note note-1" />
            <FaGuitar className="note note-2" />
            <FaStar className="note note-3" />
            <FaMusic className="note note-4" />
            <FaGuitar className="note note-5" />
            <FaStar className="note note-6" />
          </div>
        </div>
      </div>

      {/* Table Layout 02 */}
      <div className="tables table-layout-bolivar-02">
        <div
          className={getClass("F1", "table-height gold-table f1")}
          onClick={(e) => handleTableClick("F1", e)}
        >
          F1
        </div>
        <div
          className={getClass("F2", "table-height gold-table f2")}
          onClick={(e) => handleTableClick("F2", e)}
        >
          F2
        </div>
        <div
          className={getClass("F3", "table-height gold-table f3")}
          onClick={(e) => handleTableClick("F3", e)}
        >
          F3
        </div>
        <div
          className={getClass("F4", "table-height gold-table f4")}
          onClick={(e) => handleTableClick("F4", e)}
        >
          F4
        </div>

        <div className="dj-area">
          <p>DJ</p>
        </div>
        <div className="table-dj"></div>
      </div>

      {/* Additional Tables in Table Layout 03 */}
      <div className="table-layout-bolivar-03">
        <div className="exit">
          <RiDoorOpenLine />
        </div>
        <div className="entrance">
          <RiDoorOpenLine />
        </div>
        <div
          className={getClass("V1", "table-height green-table v1")}
          onClick={(e) => handleTableClick("V1", e)}
        >
          V1
        </div>
        <div
          className={getClass("V2", "table-height green-table v2")}
          onClick={(e) => handleTableClick("V2", e)}
        >
          V2
        </div>
        <div
          className={getClass("V3", "table-height green-table v3")}
          onClick={(e) => handleTableClick("V3", e)}
        >
          V3
        </div>
        <div
          className={getClass("V4", "table-height green-table v4")}
          onClick={(e) => handleTableClick("V4", e)}
        >
          V4
        </div>
        <div
          className={getClass("V5", "table-height green-table v5")}
          onClick={(e) => handleTableClick("V5", e)}
        >
          V5
        </div>
        <div
          className={getClass("V6", "table-height green-table v6")}
          onClick={(e) => handleTableClick("V6", e)}
        >
          V6
        </div>
        <div
          className={getClass("V7", "table-height green-table v7")}
          onClick={(e) => handleTableClick("V7", e)}
        >
          V7
        </div>
        <div
          className={getClass("V8", "table-width green-table v8")}
          onClick={(e) => handleTableClick("V8", e)}
        >
          V8
        </div>
        <div
          className={getClass("V9", "table-width green-table v9")}
          onClick={(e) => handleTableClick("V9", e)}
        >
          V9
        </div>
        <div className="table-booth">
          <p>VIP BOOTH AREA</p>
          <div className="vip-romantic-elements">
            <FaHeart className="romantic-item heart-1" />
            <FaHeart className="romantic-item heart-2" />
            <FaHeart className="romantic-item heart-3" />
            <FaRegKissWinkHeart className="romantic-item kiss-1" />
            <FaGrinHearts className="romantic-item kiss-2" />
            <FaGem className="romantic-item sparkle" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableLayoutBolivar;
