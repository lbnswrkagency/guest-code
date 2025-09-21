import React, { useEffect, useRef } from "react";
import "./TableLayoutHarlem.scss";
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

const TableLayoutHarlem = ({
  codes,
  tableNumber,
  setTableNumber,
  counts,
  refreshTrigger,
  onConfigurationLoaded,
}) => {
  // Ref to track if config was sent to prevent multiple sends
  const configSentRef = useRef(false);

  // Table configuration with minimum spend and max persons - Harlem layout
  const tableConfig = {
    // D tables (DJ area) - €200 minimum, 6 persons max
    D3: { minSpend: 200, maxPersons: 6, category: "D" },
    D4: { minSpend: 200, maxPersons: 6, category: "D" },
    D5: { minSpend: 200, maxPersons: 6, category: "D" },
    D6: { minSpend: 200, maxPersons: 6, category: "D" },
    D7: { minSpend: 200, maxPersons: 6, category: "D" },
    D8: { minSpend: 200, maxPersons: 6, category: "D" },

    // V tables (VIP area) - €300 minimum, 6-8 persons max
    V1: { minSpend: 300, maxPersons: 8, category: "V" },
    V2: { minSpend: 300, maxPersons: 8, category: "V" },
    V3: { minSpend: 300, maxPersons: 8, category: "V" },
    V4: { minSpend: 300, maxPersons: 8, category: "V" },
    V5: { minSpend: 300, maxPersons: 8, category: "V" },
    V6: { minSpend: 300, maxPersons: 8, category: "V" },
    V7: { minSpend: 300, maxPersons: 8, category: "V" },
    V8: { minSpend: 300, maxPersons: 8, category: "V" },
    V9: { minSpend: 300, maxPersons: 8, category: "V" },
    V10: { minSpend: 300, maxPersons: 8, category: "V" },
    V11: { minSpend: 300, maxPersons: 8, category: "V" },
    V12: { minSpend: 300, maxPersons: 8, category: "V" },
    V13: { minSpend: 300, maxPersons: 8, category: "V" },
    V14: { minSpend: 300, maxPersons: 8, category: "V" },

    // B tables (Backstage) - €500 minimum, 8 persons max
    B1: { minSpend: 500, maxPersons: 8, category: "B" },
    B2: { minSpend: 500, maxPersons: 8, category: "B" },
    B3: { minSpend: 500, maxPersons: 8, category: "B" },
    B4: { minSpend: 500, maxPersons: 8, category: "B" },
    B5: { minSpend: 500, maxPersons: 8, category: "B" },
    B6: { minSpend: 500, maxPersons: 8, category: "B" },
    B7: { minSpend: 500, maxPersons: 8, category: "B" },
    B8: { minSpend: 500, maxPersons: 8, category: "B" },

    // D tables (Backstage Stand) - €300 minimum, 4 persons max
    D1: { minSpend: 300, maxPersons: 4, category: "D" },
    D2: { minSpend: 300, maxPersons: 4, category: "D" },

    // E tables (Exclusive Backstage) - €1000 minimum, 10 persons max
    E1: { minSpend: 1000, maxPersons: 10, category: "E" },
    E2: { minSpend: 1000, maxPersons: 10, category: "E" },
    E3: { minSpend: 1000, maxPersons: 10, category: "E" },
  };

  // Categorize tables for the parent components to use
  const tableCategories = {
    djarea: ["D3", "D4", "D5", "D6", "D7", "D8"],
    vip: [
      "V1",
      "V2",
      "V3",
      "V4",
      "V5",
      "V6",
      "V7",
      "V8",
      "V9",
      "V10",
      "V11",
      "V12",
      "V13",
      "V14",
    ],
    backstage: [
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "D1",
      "D2",
      "E1",
      "E2",
      "E3",
    ],
  };

  // Category to area name mapping
  const categoryAreaNames = {
    D: "Backstage Stand",
    V: "VIP Area",
    B: "Backstage",
    E: "Backstage Exclusive",
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
    <div className="table-layout-harlem">
      {/* Table Layout 01 - DJ Area with D Tables */}
      <div className="tables table-layout-harlem-01">
        {/* <div className="entrance-area">
          <p>ENTRANCE</p>
        </div> */}

        <div className="table-main-floor"></div>
        {/* <div className="top-steps"></div> */}
        {/* <div className="right-steps"></div> */}
        {/* <div className="bottom-steps"></div>
        <div className="right-columns"></div> */}
      </div>

      {/* Table Layout 02 - Dancefloor */}
      <div className="tables table-layout-harlem-02">
        <div className="dj-area">
          <p>DJ</p>
        </div>
        <div className="bar-area">
          <p>BAR</p>
        </div>

        <div className="wc-area">
          <p>WC</p>
        </div>

        <div className="dancefloor-area"></div>
      </div>

      <div className="table-layout-harlem-025">
        <div className="vip-corner-background"></div>
      </div>

      {/* Table Layout 03 - VIP Area */}
      <div className="table-layout-harlem-03">
        <div
          className={getClass("V1", "table-round bronze-table v1")}
          onClick={(e) => handleTableClick("V1", e)}
        >
          V1
        </div>
        <div
          className={getClass("V2", "table-round bronze-table v2")}
          onClick={(e) => handleTableClick("V2", e)}
        >
          V2
        </div>

        <div
          className={getClass("V3", "table-round bronze-table v3")}
          onClick={(e) => handleTableClick("V3", e)}
        >
          V3
        </div>

        <div
          className={getClass("V4", "table-round bronze-table v4")}
          onClick={(e) => handleTableClick("V4", e)}
        >
          V4
        </div>

        <div
          className={getClass("V5", "table-round bronze-table v5")}
          onClick={(e) => handleTableClick("V5", e)}
        >
          V5
        </div>

        <div
          className={getClass("V6", "table-round bronze-table v6")}
          onClick={(e) => handleTableClick("V6", e)}
        >
          V6
        </div>

        <div
          className={getClass("V7", "table-round bronze-table v7")}
          onClick={(e) => handleTableClick("V7", e)}
        >
          V7
        </div>

        <div
          className={getClass("V8", "table-round bronze-table v8")}
          onClick={(e) => handleTableClick("V8", e)}
        >
          V8
        </div>

        <div
          className={getClass("V9", "table-round bronze-table v9")}
          onClick={(e) => handleTableClick("V9", e)}
        >
          V9
        </div>

        <div
          className={getClass("V10", "table-round bronze-table v10")}
          onClick={(e) => handleTableClick("V10", e)}
        >
          V10
        </div>

        <div
          className={getClass("V11", "table-round bronze-table v11")}
          onClick={(e) => handleTableClick("V11", e)}
        >
          V11
        </div>

        <div
          className={getClass("V12", "table-round bronze-table v12")}
          onClick={(e) => handleTableClick("V12", e)}
        >
          V12
        </div>

        <div
          className={getClass("V13", "table-round bronze-table v13")}
          onClick={(e) => handleTableClick("V13", e)}
        >
          V13
        </div>

        <div
          className={getClass("V14", "table-round bronze-table v14")}
          onClick={(e) => handleTableClick("V14", e)}
        >
          V14
        </div>

        <div className="vip-background"></div>
      </div>

      {/* Table Layout 04 - Staircase */}
      <div className="table-layout-harlem-04">
        <div className="staircase-area"></div>
      </div>

      {/* Table Layout 05 - Backstage */}
      <div className="table-layout-harlem-05">
        <div
          className={getClass("E1", "table-round exclusive-table e1")}
          onClick={(e) => handleTableClick("E1", e)}
        >
          E1
        </div>

        <div
          className={getClass("E2", "table-round exclusive-table e2")}
          onClick={(e) => handleTableClick("E2", e)}
        >
          E2
        </div>
        <div
          className={getClass("E3", "table-round exclusive-table e3")}
          onClick={(e) => handleTableClick("E3", e)}
        >
          E3
        </div>

        <div
          className={getClass("D1", "table-round stand-table d1")}
          onClick={(e) => handleTableClick("D1", e)}
        >
          D1
        </div>

        <div
          className={getClass("D2", "table-round stand-table d2")}
          onClick={(e) => handleTableClick("D2", e)}
        >
          D2
        </div>

        <div
          className={getClass("B1", "table-round golden-table b1")}
          onClick={(e) => handleTableClick("B1", e)}
        >
          B1
        </div>
        <div
          className={getClass("B2", "table-round golden-table b2")}
          onClick={(e) => handleTableClick("B2", e)}
        >
          B2
        </div>

        <div
          className={getClass("B3", "table-round golden-table b3")}
          onClick={(e) => handleTableClick("B3", e)}
        >
          B3
        </div>

        <div
          className={getClass("B4", "table-round golden-table b4")}
          onClick={(e) => handleTableClick("B4", e)}
        >
          B4
        </div>

        <div
          className={getClass("B5", "table-round golden-table b5")}
          onClick={(e) => handleTableClick("B5", e)}
        >
          B5
        </div>

        <div
          className={getClass("B6", "table-round golden-table b6")}
          onClick={(e) => handleTableClick("B6", e)}
        >
          B6
        </div>

        <div
          className={getClass("B7", "table-round golden-table b7")}
          onClick={(e) => handleTableClick("B7", e)}
        >
          B7
        </div>

        <div
          className={getClass("B8", "table-round golden-table b8")}
          onClick={(e) => handleTableClick("B8", e)}
        >
          B8
        </div>

        <div className="backstage-background"></div>
        <div className="terrace-edge"></div>
        <div className="column-capitals"></div>
      </div>
    </div>
  );
};

export default TableLayoutHarlem;
