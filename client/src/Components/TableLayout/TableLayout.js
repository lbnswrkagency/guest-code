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

  return (
    <div className="table-layout">
      <div className="tables table-layout-01">
        <div className="bar-area-backstage">
          <p>BAR</p>
        </div>
        <div className="table wc">WC</div>
        {/* <div
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
        </div> */}
        <div
          className={getClass("P1", "table-round red-table p1")}
          onClick={() => handleTableClick("P1")}
        >
          P1
        </div>
        <div
          className={getClass("P2", "table-round red-table p2")}
          onClick={() => handleTableClick("P2")}
        >
          P2
        </div>

        <div
          className={getClass("P3", "table-round red-table p3")}
          onClick={() => handleTableClick("P3")}
        >
          P3
        </div>
      </div>

      <div className="tables table-layout-02">
        <div
          className={getClass("P4", "table-vertical red-table p4")}
          onClick={() => handleTableClick("P4")}
        >
          P4
        </div>
        <div
          className={getClass("P5", "table-vertical red-table p5")}
          onClick={() => handleTableClick("P5")}
        >
          P5
        </div>
        <div
          className={getClass("P6", "table-vertical red-table p6")}
          onClick={() => handleTableClick("P6")}
        >
          P6
        </div>
        <div
          className={getClass("B4", "table-vertical red-table b4")}
          onClick={() => handleTableClick("B4")}
        >
          B4
        </div>
        <div
          className={getClass("B5", "table-vertical red-table b5")}
          onClick={() => handleTableClick("B5")}
        >
          B5
        </div>

        <div
          className={getClass("B3", "table-vertical red-table b3")}
          onClick={() => handleTableClick("B3")}
        >
          B3
        </div>
        <div
          className={getClass("B2", "table-round red-table b2")}
          onClick={() => handleTableClick("B2")}
        >
          B2
        </div>
        <div
          className={getClass("B1", "table-round red-table b1")}
          onClick={() => handleTableClick("B1")}
        >
          B1
        </div>
        <div className="dj-area">
          <p>DJ</p>
        </div>
      </div>

      <div className="tables table-layout-03">
        <div
          className={getClass("K1", "table-vertical blue-table k1")}
          onClick={() => handleTableClick("K1")}
        >
          K1
        </div>
        <div
          className={getClass("K2", "table-vertical blue-table k2")}
          onClick={() => handleTableClick("K2")}
        >
          K2
        </div>

        <div
          className={getClass("F2", "table-vertical green-table f2")}
          onClick={() => handleTableClick("F2")}
        >
          F2
        </div>
        <div
          className={getClass("F1", "table-vertical green-table f1")}
          onClick={() => handleTableClick("F1")}
        >
          F1
        </div>
        <div
          className={getClass("A1", "table-vertical green-table a1")}
          onClick={() => handleTableClick("A1")}
        >
          A1
        </div>
        <div
          className={getClass("A2", "table-vertical green-table a2")}
          onClick={() => handleTableClick("A2")}
        >
          A2
        </div>
      </div>

      <div className="tables table-layout-03">
        <div
          className={getClass("K3", "table-vertical blue-table k3")}
          onClick={() => handleTableClick("K3")}
        >
          K3
        </div>
        <div
          className={getClass("K4", "table-vertical blue-table k4")}
          onClick={() => handleTableClick("K4")}
        >
          K4
        </div>

        <div
          className={getClass("F4", "table-vertical green-table f4")}
          onClick={() => handleTableClick("F4")}
        >
          F4
        </div>
        <div
          className={getClass("F3", "table-vertical green-table f3")}
          onClick={() => handleTableClick("F3")}
        >
          F3
        </div>

        <div
          className={getClass("A3", "table-vertical green-table a3")}
          onClick={() => handleTableClick("A3")}
        >
          A3
        </div>
      </div>

      <div className="tables table-layout-03"></div>

      <div className="tables table-layout-04">
        <div className="bar-area">
          <p>BAR</p>
        </div>
        <div className="table exit">EXIT</div>
        <div className="sound-area">
          <p>SOUND</p>
        </div>
      </div>
    </div>
  );
};

export default TableLayout;
