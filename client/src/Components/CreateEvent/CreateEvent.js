// CreateEvent.js
import React, { useState, useContext } from "react"; // Add useContext
import { useNavigate } from "react-router-dom";
import "./CreateEvent.scss";
import { createEvent, compressAndOptimizeFiles } from "../../utils/apiClient"; // Updated import
import BackButton from "../BackButton/BackButton";
import AuthContext from "../../contexts/AuthContext"; // Add import
import EventForm from "../EventForm/EventForm";

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
    carousel: false,
  });

  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Add this line to access the user from the context

  const handleSubmit = async (event, eventData) => {
    event.preventDefault();
    console.log("CreateEvent eventData:", eventData);

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

      // Reset eventData to its initial values
      setEventData({
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
        carousel: false,
      });
    } catch (error) {
      console.error("Error submitting event:", error);
    }
  };

  const handleFileUpload = (file, selectedRatio, uploadType) => {
    // Update eventData based on selectedRatio and uploadType
    setEventData({
      ...eventData,
      [uploadType]: {
        ...eventData[uploadType],
        [selectedRatio]: file,
      },
    });
  };

  return (
    <div className="create-event">
      <BackButton />
      <h1>Create Event</h1>
      <EventForm
        initialEventData={eventData}
        onSubmit={handleSubmit}
        onFileUpload={handleFileUpload}
        isEditing={false}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default CreateEvent;
