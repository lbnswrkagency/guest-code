import React, { useState } from "react";
import axios from "axios";
import "./ActionButtons.scss";

const ActionButtons = ({
  item,
  onConfirm,
  onDecline,
  onReset,
  token,
  confirmRoute,
  declineRoute,
  resetRoute,
  confirmLabel = "Confirm",
  declineLabel = "Decline",
  resetLabel = "Reset",
}) => {
  const [activeButton, setActiveButton] = useState(null);

  const handleAction = async (action) => {
    try {
      let response;
      let route;
      switch (action) {
        case "confirm":
          route = confirmRoute;
          break;
        case "decline":
          route = declineRoute;
          break;
        case "reset":
          route = resetRoute;
          break;
        default:
          console.error("Invalid action");
          return;
      }

      response = await axios.post(
        route(item._id),
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Set the active button
      setActiveButton(action === "reset" ? null : action);

      switch (action) {
        case "confirm":
          onConfirm(response.data);
          break;
        case "decline":
          onDecline(response.data);
          break;
        case "reset":
          onReset(response.data);
          break;
      }
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
    }
  };

  return (
    <div className="action-buttons">
      <button
        className={`confirm ${activeButton === "confirm" ? "active" : ""}`}
        onClick={() => handleAction("confirm")}
      >
        {confirmLabel}
      </button>
      <button
        className={`decline ${activeButton === "decline" ? "active" : ""}`}
        onClick={() => handleAction("decline")}
      >
        {declineLabel}
      </button>
      <button className="reset" onClick={() => handleAction("reset")}>
        {resetLabel}
      </button>
    </div>
  );
};

export default ActionButtons;
