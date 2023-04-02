import React, { useState, useEffect } from "react";
import FileUpload from "../FileUpload/FileUpload";

const EventForm = ({
  initialEventData,
  onSubmit,
  onCancel = () => {},
  isEditing,
  onFileUpload,
  onEventDataChange,
}) => {
  const [eventData, setEventData] = useState(initialEventData);

  useEffect(() => {
    setEventData(initialEventData);
  }, [initialEventData]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    const newEventData = {
      ...eventData,
      [name]: type === "checkbox" ? checked : value,
    };
    setEventData(newEventData);

    if (isEditing) {
      onEventDataChange(newEventData);
    }
  };

  console.log("EventForm.js", eventData);
  return (
    <form onSubmit={(event) => onSubmit(event, eventData)}>
      <input
        type="text"
        name="title"
        value={eventData.title}
        onChange={handleChange}
        placeholder="Event Title"
      />
      <input
        type="text"
        name="subTitle"
        value={eventData.subTitle}
        onChange={handleChange}
        placeholder="Sub Title"
      />
      <input
        type="text"
        name="text"
        value={eventData.text}
        onChange={handleChange}
        placeholder="Text"
      />
      <FileUpload
        handleUpload={onFileUpload}
        uploadType="flyer"
        eventData={eventData.flyer}
      />
      <FileUpload
        handleUpload={onFileUpload}
        uploadType="video"
        eventData={eventData.video}
      />
      <input
        type="date"
        name="date"
        value={eventData.date}
        onChange={handleChange}
      />
      <input
        type="text"
        name="time"
        value={eventData.time}
        onChange={handleChange}
        placeholder="Time"
      />
      <input
        type="text"
        name="location"
        value={eventData.location}
        onChange={handleChange}
        placeholder="Location"
      />
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="guestCode"
          checked={eventData.guestCode}
          onChange={handleChange}
        />
        <label>Guest Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="friendsCode"
          checked={eventData.friendsCode}
          onChange={handleChange}
        />
        <label>Friends Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="ticketCode"
          checked={eventData.ticketCode}
          onChange={handleChange}
        />

        <label>Ticket Code</label>
      </div>
      <div className="checkbox-container">
        <input
          type="checkbox"
          name="tableCode"
          checked={eventData.tableCode}
          onChange={handleChange}
        />
        <label>Table Code</label>
      </div>
      <button type="submit">{isEditing ? "Save Changes" : "Save Event"}</button>
      {isEditing && (
        <button type="button" onClick={() => onCancel(initialEventData)}>
          Cancel
        </button>
      )}
    </form>
  );
};

export default EventForm;
