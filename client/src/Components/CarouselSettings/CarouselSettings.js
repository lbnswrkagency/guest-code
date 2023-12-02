import React, { useState } from "react";
import { updateGuestCodeCondition } from "../../utils/apiClient";
import { useNavigate } from "react-router-dom";

const CarouselSettings = ({ eventId, setShowCarouselSettings }) => {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const carouselCondition = number.trim();

    // Send the guestCodeCondition to the server
    updateGuestCodeCondition(eventId, carouselCondition)
      .then(() => {
        // Redirect to the previous page (EventDetails) after saving
        navigate(-1);
      })
      .catch((error) => {
        console.error("Error updating guest code condition:", error);
      });
  };

  return (
    <div className="carousel-settings">
      <h2>Guest Code Settings</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="input-number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Enter guest code condition"
        />
        <button className="submit-button" type="submit">
          Save
        </button>
        <button
          className="cancel-button"
          type="button"
          onClick={() => setShowCarouselSettings((prev) => !prev)}
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default CarouselSettings;
