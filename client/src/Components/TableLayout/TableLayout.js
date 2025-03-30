import React from "react";
import "./TableLayout.scss"; // Ensure the CSS file exists and is correctly linked

const TableLayout = ({ codes, tableNumber, setTableNumber, counts }) => {
  // This function checks if a specific table is booked
  const isBooked = (table) =>
    counts.tableCounts.some(
      (code) =>
        (code.table === table || code.tableNumber === table) &&
        code.status !== "declined" &&
        code.status !== "cancelled"
    );

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
      setTableNumber(table, {
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      });
    }
  };

  return (
    <div className="table-layout">
      <div className="table-guide">Click a Table</div>

      {/* Table Layout 01 */}
      <div className="tables table-layout-01">
        <div className="bar-area-backstage">
          <p>BAR</p>
        </div>

        <div className="table wc">WC</div>

        <div
          className={getClass("E1", "table-round black-table e1")}
          onClick={(e) => handleTableClick("E1", e)}
        >
          E1
        </div>
        <div
          className={getClass("E2", "table-round black-table e2")}
          onClick={(e) => handleTableClick("E2", e)}
        >
          E2
        </div>

        <div
          className={getClass("P1", "table-round red-table p1")}
          onClick={(e) => handleTableClick("P1", e)}
        >
          P1
        </div>
        <div
          className={getClass("P2", "table-round red-table p2")}
          onClick={(e) => handleTableClick("P2", e)}
        >
          P2
        </div>
        <div
          className={getClass("P3", "table-round red-table p3")}
          onClick={(e) => handleTableClick("P3", e)}
        >
          P3
        </div>
      </div>

      {/* Table Layout 02 */}
      <div className="tables table-layout-02">
        <div
          className={getClass("P4", "table-vertical red-table p4")}
          onClick={(e) => handleTableClick("P4", e)}
        >
          P4
        </div>
        <div
          className={getClass("P5", "table-vertical red-table p5")}
          onClick={(e) => handleTableClick("P5", e)}
        >
          P5
        </div>
        <div
          className={getClass("P6", "table-vertical red-table p6")}
          onClick={(e) => handleTableClick("P6", e)}
        >
          P6
        </div>
        <div
          className={getClass("B4", "table-vertical gold-table b4")}
          onClick={(e) => handleTableClick("B4", e)}
        >
          B4
        </div>
        <div
          className={getClass("B5", "table-vertical gold-table b5")}
          onClick={(e) => handleTableClick("B5", e)}
        >
          B5
        </div>
        <div
          className={getClass("B3", "table-vertical gold-table b3")}
          onClick={(e) => handleTableClick("B3", e)}
        >
          B3
        </div>
        <div
          className={getClass("B2", "table-round gold-table b2")}
          onClick={(e) => handleTableClick("B2", e)}
        >
          B2
        </div>
        <div
          className={getClass("B1", "table-round gold-table b1")}
          onClick={(e) => handleTableClick("B1", e)}
        >
          B1
        </div>
        <div className="dj-area premium-zone">
          <p>DJ</p>
        </div>
      </div>

      {/* Table Layout 03 */}
      <div className="tables table-layout-03">
        <div
          className={getClass("K1", "table-vertical blue-table k1")}
          onClick={(e) => handleTableClick("K1", e)}
        >
          K1
        </div>
        <div
          className={getClass("K2", "table-vertical blue-table k2")}
          onClick={(e) => handleTableClick("K2", e)}
        >
          K2
        </div>
        <div
          className={getClass("F2", "table-vertical green-table f2")}
          onClick={(e) => handleTableClick("F2", e)}
        >
          F2
        </div>
        <div
          className={getClass("F1", "table-vertical green-table f1")}
          onClick={(e) => handleTableClick("F1", e)}
        >
          F1
        </div>
        <div
          className={getClass("A1", "table-vertical green-table a1")}
          onClick={(e) => handleTableClick("A1", e)}
        >
          A1
        </div>
        <div
          className={getClass("A2", "table-vertical green-table a2")}
          onClick={(e) => handleTableClick("A2", e)}
        >
          A2
        </div>
      </div>

      {/* Additional Tables in Table Layout 03 */}
      <div className="tables table-layout-03">
        <div
          className={getClass("K3", "table-vertical blue-table k3")}
          onClick={(e) => handleTableClick("K3", e)}
        >
          K3
        </div>
        <div
          className={getClass("K4", "table-vertical blue-table k4")}
          onClick={(e) => handleTableClick("K4", e)}
        >
          K4
        </div>
        <div
          className={getClass("F4", "table-vertical green-table f4")}
          onClick={(e) => handleTableClick("F4", e)}
        >
          F4
        </div>
        <div
          className={getClass("F3", "table-vertical green-table f3")}
          onClick={(e) => handleTableClick("F3", e)}
        >
          F3
        </div>
        <div
          className={getClass("A3", "table-vertical green-table a3")}
          onClick={(e) => handleTableClick("A3", e)}
        >
          A3
        </div>
      </div>

      {/* Table Layout 04 */}
      <div className="tables table-layout-04">
        <div
          className={getClass("R1", "table-vertical black-table r1")}
          onClick={(e) => handleTableClick("R1", e)}
        >
          R1
        </div>
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
