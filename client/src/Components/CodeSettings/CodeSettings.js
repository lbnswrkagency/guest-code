// CodeSettings.js
import React, { useState, useEffect } from "react";
import "./CodeSettings.scss";
import TableLayout from "../TableLayout/TableLayout";
import {
  RiCodeLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiGridLine,
  RiStarLine,
  RiFireLine,
  RiHeartLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
  RiPaletteLine,
} from "react-icons/ri";

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
  icon,
  setIcon,
  counts,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Available icons
  const icons = [
    { name: "RiCodeLine", component: <RiCodeLine /> },
    { name: "RiTicketLine", component: <RiTicketLine /> },
    { name: "RiUserLine", component: <RiUserLine /> },
    { name: "RiVipLine", component: <RiVipLine /> },
    { name: "RiTableLine", component: <RiTableLine /> },
    { name: "RiGridLine", component: <RiGridLine /> },
    { name: "RiStarLine", component: <RiStarLine /> },
    { name: "RiFireLine", component: <RiFireLine /> },
    { name: "RiHeartLine", component: <RiHeartLine /> },
    { name: "RiThumbUpLine", component: <RiThumbUpLine /> },
    { name: "RiCupLine", component: <RiCupLine /> },
    { name: "RiGift2Line", component: <RiGift2Line /> },
    { name: "RiMedalLine", component: <RiMedalLine /> },
    { name: "RiTrophyLine", component: <RiTrophyLine /> },
  ];

  useEffect(() => {
    // Set default condition for Friends codes
    if (codeType === "Friends" && condition === "") {
      setCondition("FREE ENTRANCE ALL NIGHT");
    }

    // Set default icon based on code type if not already set
    if (!icon && setIcon) {
      switch (codeType) {
        case "Guest":
          setIcon("RiUserLine");
          break;
        case "Friends":
          setIcon("RiHeartLine");
          break;
        case "Ticket":
          setIcon("RiTicketLine");
          break;
        case "Table":
          setIcon("RiTableLine");
          break;
        case "Backstage":
          setIcon("RiVipLine");
          break;
        default:
          setIcon("RiCodeLine");
      }
    }
  }, [codeType, condition, setCondition, icon, setIcon]);

  const handleConditionChange = (event) => {
    setCondition(event.target.value);
  };

  const handleIconSelect = (iconName) => {
    if (setIcon) {
      setIcon(iconName);
    }
    setShowIconPicker(false);
  };

  // Get the currently selected icon component
  const getCurrentIcon = () => {
    const iconObj = icons.find((i) => i.name === icon);
    return iconObj ? iconObj.component : <RiCodeLine />;
  };

  return (
    <div className="code-settings">
      {/* Icon selection */}
      {setIcon && (
        <div className="icon-selector">
          <div
            className="current-icon"
            onClick={() => setShowIconPicker(!showIconPicker)}
          >
            {getCurrentIcon()}
            <RiPaletteLine className="edit-icon" />
          </div>

          {showIconPicker && (
            <div className="icon-grid">
              {icons.map((iconItem) => (
                <div
                  key={iconItem.name}
                  className={`icon-option ${
                    icon === iconItem.name ? "selected" : ""
                  }`}
                  onClick={() => handleIconSelect(iconItem.name)}
                >
                  {iconItem.component}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
