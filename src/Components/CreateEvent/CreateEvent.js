// CreateEvent.js
import React, { useState, useContext } from "react"; // Add useContext
import { useNavigate } from "react-router-dom";
import "./CreateEvent.scss";
import { createEvent, compressAndOptimizeFiles } from "../../utils/apiClient"; // Updated import
import BackButton from "../BackButton/BackButton";
import AuthContext from "../../contexts/AuthContext"; // Add import
import FileUpload from "../FileUpload/FileUpload";

const CreateEvent = () => {
  const [eventData, setEventData] = useState({
    title: "",
    subTitle: "",
    text: "",
    flyer: {
      instagramStory: "",
      squareFormat: "",
      landscape: "",
    },
    video: {
      instagramStory: "",
      squareFormat: "",
      landscape: "",
    },
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

    try {
      // Compress and optimize files on the server-side
      const optimizedEventData = await compressAndOptimizeFiles(
        eventData,
        user._id
      );

      // Call the API to create the event and pass optimizedEventData along with the user ID
      await createEvent({ ...optimizedEventData, user: user._id }); // Add the user ID to the eventData
      // After successfully creating the event, navigate back to the events page
      navigate("/events");
    } catch (error) {
      console.error("Error submitting event:", error);
    }
  };

  const handleFileUpload = (file, selectedRatio, uploadType) => {
    // Convert the File object to a data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      // Update eventData based on selectedRatio and uploadType
      setEventData({
        ...eventData,
        [uploadType]: {
          ...eventData[uploadType],
          [selectedRatio]: reader.result,
        },
      });
    };
    reader.readAsDataURL(file);
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
        <FileUpload
          handleUpload={handleFileUpload}
          uploadType="flyer"
          eventData={eventData.flyer}
        />
        <FileUpload
          handleUpload={handleFileUpload}
          uploadType="video"
          eventData={eventData.video}
        />
        Now, with these changes, the `FileUpload
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
