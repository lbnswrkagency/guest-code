import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateEvent.scss";
import { createEvent, compressAndOptimizeFiles } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";
import AuthContext from "../../contexts/AuthContext";
import EventForm from "../EventForm/EventForm";
import Footer from "../Footer/Footer";
import Navigation from "../Navigation/Navigation";

const CreateEvent = () => {
  const [eventData, setEventData] = useState({
    title: "",
    subTitle: "",
    text: "",
    date: new Date(),
    startTime: "10:00",
    endTime: "20:00",
    location: "",
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
  });

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleEventDataChange = (updatedEventData) => {
    setEventData(updatedEventData);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const optimizedEventData = await compressAndOptimizeFiles(
        eventData,
        user._id
      );
      await createEvent({ ...optimizedEventData, user: user._id });
      navigate("/events");
    } catch (error) {
      console.error("Error submitting event:", error);
    }
  };

  const handleFileUpload = (file, selectedRatio, uploadType) => {
    setEventData((prev) => ({
      ...prev,
      [uploadType]: {
        ...prev[uploadType],
        [selectedRatio]: file,
      },
    }));
  };

  return (
    <div className="createEvent">
      <Navigation />
      {/* <BackButton /> */}
      <h1 className="createEvent-title">Create Event</h1>
      <EventForm
        initialEventData={eventData}
        onEventDataChange={handleEventDataChange}
        onSubmit={handleSubmit}
        isEditing={false}
        onCancel={() => navigate(-1)}
      />
      <Footer />
    </div>
  );
};

export default CreateEvent;
