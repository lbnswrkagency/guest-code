import React from "react";
import "./TableLayout.scss"; // Make sure to create a corresponding CSS file

const TableLayout = () => {
  return (
    <div className="table-layout">
      <div className="bar" id="bar2">
        Bar 2
      </div>
      {/* Tables B1 to B14 in red */}
      <div className="tables red-tables">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="table" id={`b${i + 1}`}>{`B${i + 1}`}</div>
        ))}
      </div>
      {/* Tables A1 to A10 in blue */}
      <div className="tables blue-tables">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="table" id={`a${i + 1}`}>{`A${i + 1}`}</div>
        ))}
      </div>
      {/* Tables D1 to D3 in green */}
      <div className="tables green-tables">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="table" id={`d${i + 1}`}>{`D${i + 1}`}</div>
        ))}
      </div>
      <div className="bar" id="bar1">
        Bar 1
      </div>
    </div>
  );
};

export default TableLayout;
