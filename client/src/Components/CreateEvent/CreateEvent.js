import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateEvent.scss";
import { createEvent, compressAndOptimizeFiles } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";
import AuthContext from "../../contexts/AuthContext";
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
    logo: "",
    page: {
      navigation: { activated: false },
      header: { activated: false },
      lineup: { activated: false },
      event: { activated: false },
      explain: { activated: false },
      slider: { activated: false },
      guestcode: { activated: false },
      aboutus: { activated: false },
      social: {
        activated: false,
        instagram: "",
        tiktok: "",
        title: "",
      },
      location: { activated: false },
      spotify: { activated: false },
      contact: { activated: false },
    },
  });

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const optimizedEventData = await compressAndOptimizeFiles(
        eventData,
        user._id
      );
      await createEvent({ ...optimizedEventData, user: user._id });
      navigate("/events");
      setEventData({
        title: "",
        subTitle: "",
        text: "",
        // reset other states as shown above
      });
    } catch (error) {
      console.error("Error submitting event:", error);
    }
  };

  const handleFileUpload = (file, selectedRatio, uploadType) => {
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
