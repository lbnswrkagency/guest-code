// CreateEvent.js
import React, { useState, useContext } from "react"; // Add useContext
import { useNavigate } from "react-router-dom";
import "./CreateEvent.scss";
import { createEvent } from "../../utils/apiClient"; // Updated import
import BackButton from "../BackButton/BackButton";
import AuthContext from "../../contexts/AuthContext"; // Add import

const CreateEvent = () => {
  const [eventData, setEventData] = useState({
    title: "",
    subTitle: "",
    text: "",
    flyer: "",
    video: "",
    date: "",
    time: "",
    location: "",
    guestCode: false,
    friendsCode: false,
    ticketCode: false,
    tableCode: false,
  });

  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Add this line to access the user from the context

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setEventData({
      ...eventData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Call the API to create the event and pass eventData along with the user ID
    try {
      await createEvent({ ...eventData, user: user._id }); // Add the user ID to the eventData
      // After successfully creating the event, navigate back to the events page
      navigate("/events");
    } catch (error) {
      console.error("Error submitting event:", error);
    }
  };

  console.log(eventData);
  return (
    <div className="create-event">
      <BackButton />
      <h1>Create Event</h1>
      <form onSubmit={handleSubmit}>
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
        <input
          type="text"
          name="flyer"
          value={eventData.flyer}
          onChange={handleChange}
          placeholder="Flyer URL"
        />
        <input
          type="text"
          name="video"
          value={eventData.video}
          onChange={handleChange}
          placeholder="Video URL"
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
        <button type="submit">Save Event</button>
      </form>
    </div>
  );
};

export default CreateEvent;
