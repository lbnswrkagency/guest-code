import React, { useEffect, useRef } from "react";
import "./TableLayoutVenti.scss";
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

const TableLayoutVenti = ({
  codes,
  tableNumber,
  setTableNumber,
  counts,
  refreshTrigger,
  onConfigurationLoaded,
}) => {
  // Ref to track if config was sent to prevent multiple sends
  const configSentRef = useRef(false);

  // Table configuration with minimum spend and max persons - Venti layout
  const tableConfig = {
    // D tables (DJ area) - €350 minimum, 6 persons max
    D1: { minSpend: 200, maxPersons: 6, category: "D" },
    D2: { minSpend: 200, maxPersons: 6, category: "D" },
    D3: { minSpend: 200, maxPersons: 6, category: "D" },
    D4: { minSpend: 200, maxPersons: 6, category: "D" },
    D5: { minSpend: 200, maxPersons: 6, category: "D" },
    D6: { minSpend: 200, maxPersons: 6, category: "D" },
    D7: { minSpend: 200, maxPersons: 6, category: "D" },
    D8: { minSpend: 200, maxPersons: 6, category: "D" },

    // V tables (VIP area) - €500 minimum, 8 persons max
    V1: { minSpend: 120, maxPersons: 8, category: "V" },
    V2: { minSpend: 120, maxPersons: 8, category: "V" },
    V3: { minSpend: 120, maxPersons: 8, category: "V" },
    V4: { minSpend: 120, maxPersons: 8, category: "V" },
    V5: { minSpend: 120, maxPersons: 8, category: "V" },
    V6: { minSpend: 120, maxPersons: 8, category: "V" },

    // U tables (Upstairs) - €400 minimum, 6 persons max
    U1: { minSpend: 300, maxPersons: 6, category: "U" },
    U2: { minSpend: 300, maxPersons: 6, category: "U" },
    U3: { minSpend: 300, maxPersons: 6, category: "U" },
  };

  // Categorize tables for the parent components to use
  const tableCategories = {
    djarea: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
    vip: ["V1", "V2", "V3", "V4", "V5", "V6"],
    upstairs: ["U1", "U2", "U3"],
  };

  // Category to area name mapping
  const categoryAreaNames = {
    D: "DJ Area",
    V: "VIP Lounge",
    U: "Upstairs",
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
    <div className="table-layout-venti">
      {/* Table Layout 01 - DJ Area with D Tables */}
      <div className="tables table-layout-venti-01">
        <div className="dj-area">
          <p>DJ</p>
        </div>

        <div
          className={getClass("D1", "table-round red-table d1")}
          onClick={(e) => handleTableClick("D1", e)}
        >
          D1
        </div>
        <div
          className={getClass("D2", "table-round red-table d2")}
          onClick={(e) => handleTableClick("D2", e)}
        >
          D2
        </div>

        <div
          className={getClass("D3", "table-round red-table d3")}
          onClick={(e) => handleTableClick("D3", e)}
        >
          D3
        </div>

        <div
          className={getClass("D4", "table-round red-table d4")}
          onClick={(e) => handleTableClick("D4", e)}
        >
          D4
        </div>

        <div
          className={getClass("D5", "table-round red-table d5")}
          onClick={(e) => handleTableClick("D5", e)}
        >
          D5
        </div>

        <div
          className={getClass("D6", "table-round red-table d6")}
          onClick={(e) => handleTableClick("D6", e)}
        >
          D6
        </div>

        <div
          className={getClass("D7", "table-round red-table d7")}
          onClick={(e) => handleTableClick("D7", e)}
        >
          D7
        </div>

        <div
          className={getClass("D8", "table-round red-table d8")}
          onClick={(e) => handleTableClick("D8", e)}
        >
          D8
        </div>

        <div className="table-main-floor"></div>
        <div className="top-steps"></div>
        <div className="bottom-steps"></div>
        <div className="right-columns"></div>
      </div>

      {/* Table Layout 02 - Dancefloor */}
      <div className="tables table-layout-venti-02">
        <div className="bar-area">
          <p>BAR</p>
        </div>
        <div className="entrance-area">
          <p>ENTRANCE</p>
        </div>
        <div className="dancefloor-area"></div>
      </div>

      {/* Table Layout 03 - VIP Area */}
      <div className="table-layout-venti-03">
        <div
          className={getClass("V1", "table-round green-table v1")}
          onClick={(e) => handleTableClick("V1", e)}
        >
          V1
        </div>
        <div
          className={getClass("V2", "table-round green-table v2")}
          onClick={(e) => handleTableClick("V2", e)}
        >
          V2
        </div>

        <div
          className={getClass("V3", "table-round green-table v3")}
          onClick={(e) => handleTableClick("V3", e)}
        >
          V3
        </div>

        <div
          className={getClass("V4", "table-round green-table v4")}
          onClick={(e) => handleTableClick("V4", e)}
        >
          V4
        </div>

        <div
          className={getClass("V5", "table-round green-table v5")}
          onClick={(e) => handleTableClick("V5", e)}
        >
          V5
        </div>

        <div
          className={getClass("V6", "table-round green-table v6")}
          onClick={(e) => handleTableClick("V6", e)}
        >
          V6
        </div>

        <div className="vip-background"></div>
      </div>

      {/* Table Layout 04 - Staircase */}
      <div className="table-layout-venti-04">
        <div className="wc-area">
          <p>WC</p>
        </div>
        <div className="staircase-area"></div>
      </div>

      {/* Table Layout 05 - Upstairs */}
      <div className="table-layout-venti-05">
        <div
          className={getClass("U1", "table-round purple-table u1")}
          onClick={(e) => handleTableClick("U1", e)}
        >
          U1
        </div>
        <div
          className={getClass("U2", "table-round purple-table u2")}
          onClick={(e) => handleTableClick("U2", e)}
        >
          U2
        </div>
        <div
          className={getClass("U3", "table-round purple-table u3")}
          onClick={(e) => handleTableClick("U3", e)}
        >
          U3
        </div>
        <div className="upstairs-background"></div>
        <div className="terrace-edge"></div>
        <div className="column-capitals"></div>
      </div>
    </div>
  );
};

export default TableLayoutVenti;
