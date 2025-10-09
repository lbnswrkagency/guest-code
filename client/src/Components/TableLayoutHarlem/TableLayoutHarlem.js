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

    // VS tables (VIP Standing) - €160 minimum, 6 persons max
    VS1: { minSpend: 160, maxPersons: 6, category: "VS" },
    VS2: { minSpend: 160, maxPersons: 6, category: "VS" },
    VS3: { minSpend: 160, maxPersons: 6, category: "VS" },

    // S tables (Standing) - €120 minimum, 6 persons max
    S1: { minSpend: 120, maxPersons: 6, category: "S" },
    S2: { minSpend: 120, maxPersons: 6, category: "S" },
    S3: { minSpend: 120, maxPersons: 6, category: "S" },
    S4: { minSpend: 120, maxPersons: 6, category: "S" },
    S5: { minSpend: 120, maxPersons: 6, category: "S" },
    S6: { minSpend: 120, maxPersons: 6, category: "S" },
    S7: { minSpend: 120, maxPersons: 6, category: "S" },
    S8: { minSpend: 120, maxPersons: 6, category: "S" },
    S9: { minSpend: 120, maxPersons: 6, category: "S" },
    S10: { minSpend: 120, maxPersons: 6, category: "S" },
    S11: { minSpend: 120, maxPersons: 6, category: "S" },
    S12: { minSpend: 120, maxPersons: 6, category: "S" },
    S13: { minSpend: 120, maxPersons: 6, category: "S" },

    // B tables (Backstage) - €500 minimum, 8 persons max
    B0: { minSpend: 500, maxPersons: 8, category: "B" },
    B1: { minSpend: 500, maxPersons: 8, category: "B" },
    B2: { minSpend: 500, maxPersons: 8, category: "B" },
    B3: { minSpend: 500, maxPersons: 8, category: "B" },
    B4: { minSpend: 500, maxPersons: 8, category: "B" },
    B5: { minSpend: 500, maxPersons: 8, category: "B" },
    B6: { minSpend: 500, maxPersons: 8, category: "B" },
    B7: { minSpend: 500, maxPersons: 8, category: "B" },
    B8: { minSpend: 500, maxPersons: 8, category: "B" },
    B9: { minSpend: 500, maxPersons: 8, category: "B" },

    // D tables (Standing Backstage) - €300 minimum, 4 persons max
    D1: { minSpend: 300, maxPersons: 4, category: "D" },
    D2: { minSpend: 300, maxPersons: 4, category: "D" },

    // E tables (Exclusive Backstage) - €1000 minimum, 10 persons max
    E1: { minSpend: 1000, maxPersons: 10, category: "E" },
    E2: { minSpend: 1000, maxPersons: 10, category: "E" },
    E3: { minSpend: 1000, maxPersons: 10, category: "E" },
  };

  // Categorize tables for the parent components to use
  const tableCategories = {
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
      "VS1",
      "VS2",
      "VS3",
    ],
    standing: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13"],
    backstage: [
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
      "D1",
      "D2",
      "E1",
      "E2",
      "E3",
    ],
  };

  // Category to area name mapping
  const categoryAreaNames = {
    S: "Standing",
    D: "Standing Backstage",
    V: "VIP",
    VS: "VIP Standing",
    B: "Backstage",
    E: "Exclusive Backstage",
  };

  // Theme colors for each category (extracted from SCSS styling)
  const categoryThemeColors = {
    S: {
      primary: "#1a1a2e", // Dark blue-grey from dance floor
      accent: "#0f3460", // Deeper blue accent
      text: "#ffffff", // White text
      border: "#2a2f3e", // Border color
    },
    V: {
      primary: "#184134", // VIP gold primary
      accent: "#b8860b", // Gold accent
      text: "#b8860b", // Gold text
      border: "rgba(184, 134, 11, 0.35)", // Gold border
    },
    VS: {
      primary: "#1e4540", // VIP Standing primary
      accent: "#c8960d", // Gold accent
      text: "#c8960d", // Gold text
      border: "rgba(200, 150, 13, 0.4)", // Gold border
    },
    B: {
      primary: "#2a2822", // Warm backstage primary
      accent: "#d4af37", // Gold accent
      text: "#d4af37", // Gold text
      border: "rgba(212, 175, 55, 0.2)", // Gold border
    },
    D: {
      primary: "#32323a", // Dark grey primary
      accent: "#b8860b", // Orange/gold accent
      text: "#b8860b", // Orange/gold text
      border: "rgba(184, 134, 11, 0.3)", // Orange border
    },
    E: {
      primary: "#4a4a54", // Premium grey primary
      accent: "#ffd700", // Bright gold accent
      text: "#ffd700", // Bright gold text
      border: "rgba(255, 215, 0, 0.5)", // Bright gold border
    },
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
        categoryThemeColors,
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
        <div className="staircase-area"></div>
        {/* <div className="table-main-floor"></div> */}
      </div>

      {/* Table Layout 02 - Dancefloor */}
      <div className="tables table-layout-harlem-02">
        <div
          className={getClass("S1", " standing-table s1")}
          onClick={(e) => handleTableClick("S1", e)}
        >
          S1
        </div>
        <div
          className={getClass("S2", " standing-table s2")}
          onClick={(e) => handleTableClick("S2", e)}
        >
          S2
        </div>

        <div
          className={getClass("S3", " standing-table s3")}
          onClick={(e) => handleTableClick("S3", e)}
        >
          S3
        </div>

        <div
          className={getClass("S4", " standing-table s4")}
          onClick={(e) => handleTableClick("S4", e)}
        >
          S4
        </div>

        <div
          className={getClass("S5", " standing-table s5")}
          onClick={(e) => handleTableClick("S5", e)}
        >
          S5
        </div>

        <div
          className={getClass("S6", " standing-table s6")}
          onClick={(e) => handleTableClick("S6", e)}
        >
          S6
        </div>

        <div
          className={getClass("S7", " standing-table s7")}
          onClick={(e) => handleTableClick("S7", e)}
        >
          S7
        </div>
        <div
          className={getClass("S8", " standing-table s8")}
          onClick={(e) => handleTableClick("S8", e)}
        >
          S8
        </div>
        <div
          className={getClass("S9", " standing-table s9")}
          onClick={(e) => handleTableClick("S9", e)}
        >
          S9
        </div>

        <div
          className={getClass("S10", " standing-table s10")}
          onClick={(e) => handleTableClick("S10", e)}
        >
          S10
        </div>

        <div
          className={getClass("S11", " standing-table s11")}
          onClick={(e) => handleTableClick("S11", e)}
        >
          S11
        </div>

        <div
          className={getClass("S12", " standing-table s12")}
          onClick={(e) => handleTableClick("S12", e)}
        >
          S12
        </div>

        <div
          className={getClass("S13", " standing-table s13")}
          onClick={(e) => handleTableClick("S13", e)}
        >
          S13
        </div>

        <div
          className={getClass("V11", "vip-table v11")}
          onClick={(e) => handleTableClick("V11", e)}
        >
          V11
        </div>

        <div
          className={getClass("V12", "vip-table v12")}
          onClick={(e) => handleTableClick("V12", e)}
        >
          V12
        </div>

        <div
          className={getClass("VS1", "vip-table vs1")}
          onClick={(e) => handleTableClick("VS1", e)}
        >
          VS1
        </div>

        <div
          className={getClass("VS2", "vip-table vs2")}
          onClick={(e) => handleTableClick("VS2", e)}
        >
          VS2
        </div>

        <div
          className={getClass("VS3", "vip-table vs3")}
          onClick={(e) => handleTableClick("VS3", e)}
        >
          VS3
        </div>

        <div className="bar-area-vip">
          <p>BAR</p>
        </div>

        <div className="dj-area-harlem">
          <p>DJ</p>
        </div>
        <div className="bar-area">
          <p>BAR</p>
        </div>

        <div className="wc-area">
          <p>WC</p>
        </div>

        <div className="vip-extension-area"></div>
        {/* 
        <div className="stair-modul"></div> */}
      </div>

      {/* Table Layout 03 - VIP Area */}
      <div className="table-layout-harlem-03">
        <div
          className={getClass("V1", "vip-table v1")}
          onClick={(e) => handleTableClick("V1", e)}
        >
          V1
        </div>
        <div
          className={getClass("V2", "vip-table v2")}
          onClick={(e) => handleTableClick("V2", e)}
        >
          V2
        </div>

        <div
          className={getClass("V3", "vip-table v3")}
          onClick={(e) => handleTableClick("V3", e)}
        >
          V3
        </div>

        <div
          className={getClass("V4", "vip-table v4")}
          onClick={(e) => handleTableClick("V4", e)}
        >
          V4
        </div>

        <div
          className={getClass("V5", "vip-table v5")}
          onClick={(e) => handleTableClick("V5", e)}
        >
          V5
        </div>

        <div
          className={getClass("V6", "vip-table v6")}
          onClick={(e) => handleTableClick("V6", e)}
        >
          V6
        </div>

        <div
          className={getClass("V7", "vip-table v7")}
          onClick={(e) => handleTableClick("V7", e)}
        >
          V7
        </div>

        <div
          className={getClass("V8", "vip-table v8")}
          onClick={(e) => handleTableClick("V8", e)}
        >
          V8
        </div>

        <div
          className={getClass("V9", "vip-table v9")}
          onClick={(e) => handleTableClick("V9", e)}
        >
          V9
        </div>

        <div
          className={getClass("V10", "vip-table v10")}
          onClick={(e) => handleTableClick("V10", e)}
        >
          V10
        </div>

        <div className="light-area-vip">
          <p>LIGHT</p>
        </div>
      </div>

      {/* Table Layout 05 - Backstage */}
      <div className="table-layout-harlem-05">
        <div
          className={getClass("E1", " exclusive-table e1")}
          onClick={(e) => handleTableClick("E1", e)}
        >
          E1
        </div>

        <div
          className={getClass("E2", " exclusive-table e2")}
          onClick={(e) => handleTableClick("E2", e)}
        >
          E2
        </div>
        <div
          className={getClass("E3", " exclusive-table e3")}
          onClick={(e) => handleTableClick("E3", e)}
        >
          E3
        </div>

        <div
          className={getClass("D1", "backstage-stand d1")}
          onClick={(e) => handleTableClick("D1", e)}
        >
          D1
        </div>

        <div
          className={getClass("D2", "backstage-stand d2")}
          onClick={(e) => handleTableClick("D2", e)}
        >
          D2
        </div>

        <div
          className={getClass("B0", "backstage-table b0")}
          onClick={(e) => handleTableClick("B0", e)}
        >
          B0
        </div>

        <div
          className={getClass("B1", "backstage-table b1")}
          onClick={(e) => handleTableClick("B1", e)}
        >
          B1
        </div>
        <div
          className={getClass("B2", "backstage-table b2")}
          onClick={(e) => handleTableClick("B2", e)}
        >
          B2
        </div>

        <div
          className={getClass("B3", "backstage-table b3")}
          onClick={(e) => handleTableClick("B3", e)}
        >
          B3
        </div>

        <div
          className={getClass("B4", "backstage-table b4")}
          onClick={(e) => handleTableClick("B4", e)}
        >
          B4
        </div>

        <div
          className={getClass("B5", "backstage-table b5")}
          onClick={(e) => handleTableClick("B5", e)}
        >
          B5
        </div>

        <div
          className={getClass("B6", "backstage-table b6")}
          onClick={(e) => handleTableClick("B6", e)}
        >
          B6
        </div>

        <div
          className={getClass("B7", "backstage-table b7")}
          onClick={(e) => handleTableClick("B7", e)}
        >
          B7
        </div>

        <div
          className={getClass("B8", "backstage-table b8")}
          onClick={(e) => handleTableClick("B8", e)}
        >
          B8
        </div>

        <div
          className={getClass("B9", "backstage-table b9")}
          onClick={(e) => handleTableClick("B9", e)}
        >
          B9
        </div>

        <div className="wc-area-05">
          <p>WC</p>
        </div>

        <div className="bar-area-05">
          <p>BAR</p>
        </div>
      </div>
    </div>
  );
};

export default TableLayoutHarlem;
