import axios from "axios";
import React, { useState } from "react";
import { updateGuestCodeCondition } from "../../utils/apiClient";

import { useNavigate } from "react-router-dom";

const GuestCodeSettings = ({ eventId, setShowGuestCodeSettings }) => {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [symbol, setSymbol] = useState("");
  const [item, setItem] = useState("");
  const [timeCondition, setTimeCondition] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const guestCodeCondition = `${number} ${symbol} ${item} ${timeCondition} ${
      timeCondition === "until" || timeCondition === "from" ? time : ""
    }`.trim();

    // Send the guestCodeCondition to the server
    updateGuestCodeCondition(eventId, guestCodeCondition)
      .then((event) => {
        // Redirect to the previous page (EventDetails) after saving
        navigate(-1);
      })
      .catch((error) => {
        console.error("Error updating guest code condition:", error);
      });
  };

  return (
    <div className="guest-code-settings">
      <h2>Guest Code Settings</h2>
      <div className="input-section">
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            className="input-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="10"
          />
          <select
            className="input-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="$">$</option>
            <option value="€">€</option>
            <option value="%">%</option>
            <option value="pcs">pcs</option>
          </select>
          <select
            className="input-item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
          >
            <option value="Discount">Discount</option>
            <option value="Long Drinks">Long Drinks</option>
            <option value="Shots">Shots</option>
          </select>
          <select
            className="input-time-condition"
            value={timeCondition}
            onChange={(e) => setTimeCondition(e.target.value)}
          >
            <option value="until">until</option>
            <option value="from">from</option>
            <option value="all day">all day</option>
            <option value="all night">all night</option>
            <option value="always">always</option>
          </select>
          {(timeCondition === "until" || timeCondition === "from") && (
            <input
              type="time"
              className="input-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="22:00"
            />
          )}
          <button className="submit-button" type="submit">
            Save
          </button>
          <button
            className="cancel-button"
            type="button"
            onClick={() => setShowGuestCodeSettings((prev) => !prev)}
          >
            Cancel
          </button>
        </form>
      </div>
      <div className="output-section">
        <div className="constructed-sentence">
          <span className="generated-number">{number}</span>
          <span className="generated-symbol">{symbol}</span>
          <span className="generated-item">{item}</span>
          <span className="generated-time-condition">{timeCondition}</span>
          {(timeCondition === "until" || timeCondition === "from") && (
            <span className="generated-time">{time}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestCodeSettings;
