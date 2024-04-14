import React from "react";
import "./TableLayout.scss"; // Ensure the CSS file exists and is correctly linked

const TableLayout = ({ codes, tableNumber, setTableNumber, counts }) => {
  // This function checks if a specific table is booked
  const isBooked = (table) =>
    counts.tableCounts.some((code) => code.table === table);

  // Function to determine CSS classes for each table
  const getClass = (table, baseClass) => {
    let classes = `${baseClass} ${tableNumber === table ? "selected" : ""} ${
      isBooked(table) ? "table-booked" : ""
    }`;
    return classes;
  };

  const handleTableClick = (table) => {
    if (!isBooked(table)) {
      setTableNumber(table);
    }
  };

  console.log("TABLE LAYOUT CODES", codes);
  console.log("TABLE LAYOUT COUNTS", counts);
  return (
    <div className="table-layout">
      <h1 className="table-layout-title">BACKSTAGE</h1>
      <div className="tables table-layout-01">
        <div className="bar-area-backstage">
          <p>BAR</p>
        </div>
        <div className="table wc">WC</div>
        <div
          className={getClass("B1", "table red-table b1")}
          onClick={() => handleTableClick("B1")}
        >
          B1
        </div>
        <div
          className={getClass("B2", "table red-table b2")}
          onClick={() => handleTableClick("B2")}
        >
          B2
        </div>
        <div
          className={getClass("B3", "table red-table b3")}
          onClick={() => handleTableClick("B3")}
        >
          B3
        </div>
        <div
          className={getClass("B4", "table red-table b4")}
          onClick={() => handleTableClick("B4")}
        >
          B4
        </div>
        <div
          className={getClass("B5", "table red-table b5")}
          onClick={() => handleTableClick("B5")}
        >
          B5
        </div>
        <div
          className={getClass("B6", "table-vertical red-table b6")}
          onClick={() => handleTableClick("B6")}
        >
          B6
        </div>
      </div>

      <div className="tables table-layout-02">
        <div
          className={getClass("A10", "table-vertical blue-table a10")}
          onClick={() => handleTableClick("A10")}
        >
          A10
        </div>
        <div
          className={getClass("A9", "table-vertical blue-table a9")}
          onClick={() => handleTableClick("A9")}
        >
          A9
        </div>
        <div
          className={getClass("B7", "table-vertical red-table b7")}
          onClick={() => handleTableClick("B7")}
        >
          B7
        </div>
        <div
          className={getClass("B8", "table-vertical red-table b8")}
          onClick={() => handleTableClick("B8")}
        >
          B8
        </div>
        <div
          className={getClass("B9", "table-vertical red-table b9")}
          onClick={() => handleTableClick("B9")}
        >
          B9
        </div>
        <div
          className={getClass("B10", "table-vertical red-table b10")}
          onClick={() => handleTableClick("B10")}
        >
          B10
        </div>
        <div
          className={getClass("B11", "table dj-table b11")}
          onClick={() => handleTableClick("B11")}
        >
          B11
        </div>
        <div
          className={getClass("B12", "table dj-table b12")}
          onClick={() => handleTableClick("B12")}
        >
          B12
        </div>
        <div className="dj-area">
          <p>DJ</p>
        </div>
      </div>

      <div className="tables table-layout-03">
        <div
          className={getClass("A8", "table-vertical blue-table a8")}
          onClick={() => handleTableClick("A8")}
        >
          A8
        </div>
        <div
          className={getClass("A7", "table-vertical blue-table a7")}
          onClick={() => handleTableClick("A7")}
        >
          A7
        </div>
        <div
          className={getClass("D1", "table-round blue-table d1")}
          onClick={() => handleTableClick("D1")}
        >
          <p>D1</p>
        </div>
        <div
          className={getClass("D2", "table-round blue-table d2")}
          onClick={() => handleTableClick("D2")}
        >
          <p>D2</p>
        </div>
        <div
          className={getClass("D3", "table-round blue-table d3")}
          onClick={() => handleTableClick("D3")}
        >
          <p>D3</p>
        </div>
        <div
          className={getClass("K5", "table-vertical green-table k5")}
          onClick={() => handleTableClick("K5")}
        >
          K5
        </div>
        <div
          className={getClass("K6", "table-vertical green-table k6")}
          onClick={() => handleTableClick("K6")}
        >
          K6
        </div>
        <div
          className={getClass("K7", "table-vertical green-table k7")}
          onClick={() => handleTableClick("K7")}
        >
          K7
        </div>
        <div
          className={getClass("K8", "table-vertical green-table k8")}
          onClick={() => handleTableClick("K8")}
        >
          K8
        </div>
      </div>

      <div className="tables table-layout-03">
        <div
          className={getClass("A6", "table-vertical blue-table a6")}
          onClick={() => handleTableClick("A6")}
        >
          A6
        </div>
        <div
          className={getClass("A5", "table-vertical blue-table a5")}
          onClick={() => handleTableClick("A5")}
        >
          A5
        </div>
        <div
          className={getClass("K3", "table-vertical green-table k3")}
          onClick={() => handleTableClick("K3")}
        >
          K3
        </div>
        <div
          className={getClass("K4", "table-vertical green-table k4")}
          onClick={() => handleTableClick("K4")}
        >
          K4
        </div>
        <div
          className={getClass("K9", "table-vertical green-table k9")}
          onClick={() => handleTableClick("K9")}
        >
          K9
        </div>
        <div
          className={getClass("K10", "table-vertical green-table k10")}
          onClick={() => handleTableClick("K10")}
        >
          K10
        </div>
      </div>

      <div className="tables table-layout-04">
        <div
          className={getClass("A4", "table-vertical blue-table a4")}
          onClick={() => handleTableClick("A4")}
        >
          A4
        </div>
        <div
          className={getClass("A3", "table-vertical blue-table a3")}
          onClick={() => handleTableClick("A3")}
        >
          A3
        </div>
        <div
          className={getClass("A2", "table blue-table a2")}
          onClick={() => handleTableClick("A2")}
        >
          A2
        </div>
        <div
          className={getClass("A1", "table blue-table a1")}
          onClick={() => handleTableClick("A1")}
        >
          A1
        </div>
        <div
          className={getClass("K2", "table-vertical green-table k2")}
          onClick={() => handleTableClick("K2")}
        >
          K2
        </div>
        <div
          className={getClass("K1", "table-vertical green-table k1")}
          onClick={() => handleTableClick("K1")}
        >
          K1
        </div>
        <div className="bar-area">
          <p>BAR</p>
        </div>
        <div className="table exit">EXIT</div>
      </div>
    </div>
  );
};

export default TableLayout;
