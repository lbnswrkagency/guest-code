import React, { useState, useEffect } from "react";
import { editEvent } from "../../utils/apiClient";
import FileUpload from "../FileUpload/FileUpload";
import { compressAndOptimizeFiles } from "../../utils/apiClient";
import EventForm from "../EventForm/EventForm";

const EditEvent = ({ event, onUpdate, eventId }) => {
  const [updatedEvent, setUpdatedEvent] = useState({
    ...event,
    flyer: {
      instagramStory: event.flyer.instagramStory || "",
      squareFormat: event.flyer.squareFormat || "",
      landscape: event.flyer.landscape || "",
    },
    video: {
      instagramStory: event.video.instagramStory || "",
      squareFormat: event.video.squareFormat || "",
      landscape: event.video.landscape || "",
    },
  });
  useEffect(() => {
    setUpdatedEvent(event);
  }, [event]);

  const handleSubmit = async (e, eventData) => {
    e.preventDefault();

    try {
      const compressedFiles = await compressAndOptimizeFiles(updatedEvent);
      const eventWithCompressedFiles = {
        ...updatedEvent,
        flyer: compressedFiles.flyer,
        video: compressedFiles.video,
      };

      const response = await editEvent(eventId, eventWithCompressedFiles);

      onUpdate(response);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleFileUpload = (file, ratio, uploadType) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUpdatedEvent((prevEvent) => {
        return {
          ...prevEvent,
          [uploadType]: {
            ...prevEvent[uploadType],
            [ratio]: dataUrl,
          },
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEventDataChange = (updatedEventData) => {
    setUpdatedEvent(updatedEventData);
  };

  return (
    <div className="edit-event">
      <h1>Edit Event</h1>
      <EventForm
        initialEventData={updatedEvent}
        onSubmit={handleSubmit}
        onCancel={onUpdate}
        onFileUpload={handleFileUpload}
        isEditing={true}
        onEventDataChange={handleEventDataChange}
      />
    </div>
  );
};

export default EditEvent;
