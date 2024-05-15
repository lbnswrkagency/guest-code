import React, { useState, useEffect } from "react";
import FileUpload from "../FileUpload/FileUpload";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import "./EventForm.scss";
import LineUp from "../Topic/LineUp";

const EventForm = ({
  initialEventData,
  onSubmit,
  onCancel,
  isEditing,
  onFileUpload,
  onEventDataChange,
}) => {
  const [eventData, setEventData] = useState(initialEventData);

  useEffect(() => {
    setEventData(initialEventData);
  }, [initialEventData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const updatedEventData = { ...eventData, [name]: value };
    setEventData(updatedEventData);
    onEventDataChange(updatedEventData);
  };

  const handleDateChange = (date) => {
    onEventDataChange({ ...eventData, date });
  };

  const handleStartTimeChange = (time) => {
    onEventDataChange({ ...eventData, startTime: time });
  };

  const handleEndTimeChange = (time) => {
    onEventDataChange({ ...eventData, endTime: time });
  };

  const handleRichTextChange = (value) => {
    onEventDataChange({ ...eventData, text: value });
  };

  return (
    <form
      className="eventForm"
      onSubmit={(event) => onSubmit(event, eventData)}
    >
      <input
        className="eventForm-title"
        type="text"
        name="title"
        value={eventData.title}
        onChange={handleChange}
        placeholder="Title"
      />
      <input
        type="text"
        name="subTitle"
        className="eventForm-subtitle"
        value={eventData.subTitle}
        onChange={handleChange}
        placeholder="Subtitle"
      />

      <LineUp />

      <FileUpload
        handleUpload={onFileUpload}
        uploadType="flyer"
        eventData={eventData.flyer}
      />
      {/* 
      <div className="eventForm-soon">
        <FileUpload
          handleUpload={onFileUpload}
          uploadType="video"
          eventData={eventData.video}
        />
      </div> */}
      <div className="eventForm-startTime">
        <h1 className="eventForm-startTime-title">Start Time</h1>
        <TimePicker
          onChange={handleStartTimeChange}
          value={eventData.startTime}
          className="time-picker"
          format="HH:mm"
        />
      </div>

      <div className="eventForm-endTime">
        <h1 className="eventForm-endTime-title">End Time</h1>
        <TimePicker
          onChange={handleEndTimeChange}
          value={eventData.endTime}
          className="time-picker"
          format="HH:mm"
        />
      </div>

      <div className="eventForm-date">
        <DayPicker
          mode="single"
          selected={eventData.date}
          onSelect={handleDateChange}
          modifiersClassNames={{
            selected: "my-selected",
            today: "my-today",
          }}
        />
      </div>

      <input
        type="text"
        className="eventForm-location"
        name="location"
        value={eventData.location}
        onChange={handleChange}
        placeholder="Location"
      />

      <ReactQuill
        theme="snow"
        value={eventData.text}
        onChange={handleRichTextChange}
        placeholder="Description"
        className="eventForm-description"
      />
      {/* <div className="eventForm-checkbox">
        <input
          type="checkbox"
          name="guestCode"
          checked={eventData.guestCode}
          onChange={handleChange}
        />
        <label>Guest Code</label>
      </div>
      <div className="eventForm-checkbox">
        <input
          type="checkbox"
          name="friendsCode"
          checked={eventData.friendsCode}
          onChange={handleChange}
        />
        <label>Friends Code</label>
      </div>
      <div className="eventForm-checkbox">
        <input
          type="checkbox"
          name="ticketCode"
          checked={eventData.ticketCode}
          onChange={handleChange}
        />

        <label>Ticket Code</label>
      </div>
      <div className="eventForm-checkbox">
        <input
          type="checkbox"
          name="tableCode"
          checked={eventData.tableCode}
          onChange={handleChange}
        />
        <label>Table Code</label>
      </div>
      <div className="eventForm-checkbox">
        <input
          type="checkbox"
          name="carousel"
          checked={eventData.carousel}
          onChange={handleChange}
        />
        <label>Carousel</label>
      </div> */}
      <button className="eventForm-submit" type="submit">
        {isEditing ? "Save Changes" : "Save Event"}
      </button>
      {isEditing && (
        <button
          className="eventForm-cancel"
          type="button"
          onClick={() => onCancel(initialEventData)}
        >
          Cancel
        </button>
      )}
    </form>
  );
};

export default EventForm;
