// CodeSettings.js
import React, { useEffect } from "react";
import "./CodeSettings.scss";
import TableLayout from "../TableLayout/TableLayout";

const CodeSettings = ({
  codeType,
  name,
  setName,
  pax,
  setPax,
  condition,
  setCondition,
  tableNumber,
  setTableNumber,
  counts,
}) => {
  useEffect(() => {
    // Set default condition for Friends codes
    if (codeType === "Friends" && condition === "") {
      setCondition("FREE ENTRANCE ALL NIGHT");
    }
  }, [codeType, condition, setCondition]);

  const handleConditionChange = (event) => {
    setCondition(event.target.value);
  };

  return (
    <div className="code-settings">
      <input
        className="code-input"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {(codeType === "Friends" ||
        codeType === "Backstage" ||
        codeType === "Table") && (
        <select
          className="code-select"
          value={pax}
          onChange={(e) => setPax(parseInt(e.target.value))}
        >
          {[...Array(5)].map((_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1} People
            </option>
          ))}
        </select>
      )}

      {codeType === "Friends" && (
        <div className="code-conditions">
          <div className="radio-option">
            <input
              type="radio"
              id="free-entrance"
              name="condition"
              value="FREE ENTRANCE ALL NIGHT"
              checked={condition === "FREE ENTRANCE ALL NIGHT"}
              onChange={handleConditionChange}
            />
            <label htmlFor="free-entrance">
              <span className="radio-label">Entrance</span>
              <span className="radio-price">Free</span>
            </label>
          </div>

          <div className="radio-option">
            <input
              type="radio"
              id="paid-entrance"
              name="condition"
              value="5€ ALL NIGHT"
              checked={condition === "5€ ALL NIGHT"}
              onChange={handleConditionChange}
            />
            <label htmlFor="paid-entrance">
              <span className="radio-label">Entrance</span>
              <span className="radio-price">5€</span>
            </label>
          </div>
        </div>
      )}

      {codeType === "Table" && (
        <div className="table-selection">
          <TableLayout
            counts={counts}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
          />
        </div>
      )}
    </div>
  );
};

export default CodeSettings;
