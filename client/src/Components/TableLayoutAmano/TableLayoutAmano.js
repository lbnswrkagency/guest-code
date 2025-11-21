import React, { useEffect, useRef } from "react";
import "./TableLayoutAmano.scss";

const TableLayoutAmano = ({
  codes,
  tableNumber,
  setTableNumber,
  counts,
  refreshTrigger,
  onConfigurationLoaded,
}) => {
  // Ref to track if config was sent to prevent multiple sends
  const configSentRef = useRef(false);

  // Table configuration with minimum spend and max persons - Amano layout
  // Only V tables (VIP) - 10 tables total
  const tableConfig = {
    V1: { minSpend: 1200, maxPersons: 15, category: "V" },
    V2: { minSpend: 500, maxPersons: 6, category: "V" },
    V3: { minSpend: 500, maxPersons: 8, category: "V" },
    V4: { minSpend: 300, maxPersons: 4, category: "V" },
    V5: { minSpend: 350, maxPersons: 6, category: "V" },
    V6: { minSpend: 350, maxPersons: 6, category: "V" },
    V7: { minSpend: 350, maxPersons: 6, category: "V" },
    V8: { minSpend: 350, maxPersons: 6, category: "V" },
    V9: { minSpend: 500, maxPersons: 8, category: "V" },
    V10: { minSpend: 500, maxPersons: 8, category: "V" },
  };

  // Categorize tables for the parent components to use
  const tableCategories = {
    vip: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"],
  };

  // Category to area name mapping
  const categoryAreaNames = {
    V: "VIP",
  };

  // Theme colors for each category
  const categoryThemeColors = {
    V: {
      primary: "#1a1a2e",
      accent: "#b8860b",
      text: "#ffffff",
      border: "#2a2f3e",
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
  }, []);

  // Re-render when refreshTrigger or counts change
  useEffect(() => {
    // Logic to handle updates can go here if needed
  }, [refreshTrigger, counts]);

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
    <div className="table-layout-amano">
      {/* Table Layout - VIP Tables */}
      <div className="tables">
        <div
          className={getClass("V1", "vip-table v1")}
          onClick={(e) => handleTableClick("V1", e)}
        >
          1
        </div>
        <div
          className={getClass("V2", "vip-table v2")}
          onClick={(e) => handleTableClick("V2", e)}
        >
          2
        </div>
        <div
          className={getClass("V3", "vip-table v3")}
          onClick={(e) => handleTableClick("V3", e)}
        >
          3
        </div>

        <div
          className={getClass("V4", "vip-table v4")}
          onClick={(e) => handleTableClick("V4", e)}
        >
          4
        </div>

        <div
          className={getClass("V5", "vip-table v5")}
          onClick={(e) => handleTableClick("V5", e)}
        >
          5
        </div>

        <div
          className={getClass("V6", "vip-table v6")}
          onClick={(e) => handleTableClick("V6", e)}
        >
          6
        </div>
        <div
          className={getClass("V7", "vip-table v7")}
          onClick={(e) => handleTableClick("V7", e)}
        >
          7
        </div>

        <div
          className={getClass("V8", "vip-table v8")}
          onClick={(e) => handleTableClick("V8", e)}
        >
          8
        </div>
        <div
          className={getClass("V9", "vip-table v9")}
          onClick={(e) => handleTableClick("V9", e)}
        >
          9
        </div>

        <div
          className={getClass("V10", "vip-table v10")}
          onClick={(e) => handleTableClick("V10", e)}
        >
          10
        </div>

        <div className="bar-area-amano">
          <p>BAR</p>
        </div>

        <div className="dj-area-amano">
          <p>DJ</p>
        </div>

        {/* <div className="divide-01"></div> */}
      </div>
    </div>
  );
};

export default TableLayoutAmano;
