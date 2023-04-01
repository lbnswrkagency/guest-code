import React, { useState, useEffect } from "react";
import { editEvent } from "../../utils/apiClient";

const EditEvent = ({ event, onUpdate, eventId }) => {
  const [updatedEvent, setUpdatedEvent] = useState(event);

  useEffect(() => {
    setUpdatedEvent(event);
  }, [event]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setUpdatedEvent({
      ...updatedEvent,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await editEvent(eventId, updatedEvent);
      onUpdate(response);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        value={event.title}
        onChange={handleChange}
        placeholder="Event Title"
      />
      <input
        type="text"
        name="subTitle"
        value={event.subTitle}
        onChange={handleChange}
        placeholder="Sub Title"
      />
      <input
        type="text"
        name="text"
        value={event.text}
        onChange={handleChange}
        placeholder="Text"
      />
      <input
        type="text"
        name="flyer"
        value={event.flyer}
        onChange={handleChange}
        placeholder="Flyer URL"
      />
      <input
        type="text"
        name="video"
        value={event.video}
        onChange={handleChange}
        placeholder="Video URL"
      />
      <input
        type="date"
        name="date"
        value={event.date}
        onChange={handleChange}
      />
      <input
        type="text"
        name="time"
        value={event.time}
        onChange={handleChange}
        placeholder="Time"
      />
      <input
        type="text"
        name="location"
        value={event.location}
        onChange={handleChange}
        placeholder="Location"
      />
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="guestCode"
          checked={event.guestCode}
          onChange={handleChange}
        />
        <label>Guest Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="friendsCode"
          checked={event.friendsCode}
          onChange={handleChange}
        />
        <label>Friends Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="ticketCode"
          checked={event.ticketCode}
          onChange={handleChange}
        />
        <label>Ticket Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="tableCode"
          checked={event.tableCode}
          onChange={handleChange}
        />
        <label>Table Code</label>
      </div>
      <button type="submit">Save Changes</button>
      <button type="button" onClick={() => onUpdate(event)}>
        Cancel
      </button>
    </form>
  );
};

export default EditEvent;
