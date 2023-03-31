import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EventDetails.scss";
import { getEventById, editEvent, deleteEvent } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const fetchedEvent = await getEventById(eventId);
        setEvent(fetchedEvent);
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (confirmDelete) {
      try {
        await deleteEvent(eventId);
        navigate("/events");
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setEvent({
      ...event,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await editEvent(eventId, event);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  return (
    <div className="event-details">
      <BackButton />
      <div className="event-details__flyer">
        <img
          src="http://www.bootiesonair.com/static/media/event.0ac92e65eff66d478724.png"
          alt="Event Flyer"
        />
      </div>
      {event ? (
        editMode ? (
          <form className="event-details__info" onSubmit={handleSubmit}>
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
            <button class="event-details__info__button" type="submit">
              Save Changes
            </button>
            <button type="button" onClick={() => setEditMode(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="event-details__info">
            <h2 className="event-details__info__title">{event.title}</h2>
            <h3 className="event-details__info__subtitle">{event.subTitle}</h3>
            <p className="event-details__info__text">{event.text}</p>
            <p className="event-details__info__date">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            <p className="event-details__info__time">{event.time}</p>
            <p className="event-details__info__location">{event.location}</p>
            {event.video && (
              <div className="event-details__info__video">
                <iframe
                  title="event-video"
                  src="http://fyped.de/sample.mp4"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="event-details__info__video-iframe"
                ></iframe>
              </div>
            )}
            <button
              className="edit-event-button event-details__info__button"
              onClick={() => setEditMode(true)}
            >
              Edit Event
            </button>
            <button
              className="view-event-page-button event-details__info__button"
              onClick={() => navigate(`/events/page/${event.link}`)} // Update this line to use the link
            >
              View Event Page
            </button>
            <button
              className="delete-event-button event-details__info__button"
              onClick={handleDelete}
            >
              Delete Event
            </button>
          </div>
        )
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default EventDetails;
