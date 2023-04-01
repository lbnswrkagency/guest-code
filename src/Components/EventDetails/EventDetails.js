import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EventDetails.scss";
import { getEventById, deleteEvent } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";
import Modal from "../Modal/Modal";
import EditEvent from "../EditEvent/EditEvent";
import GuestCodeSettings from "../GuestCodeSettings/GuestCodeSettings";

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showGuestCodeSettings, setShowGuestCodeSettings] = useState(false);

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

  return (
    <div className="event-details">
      <BackButton />
      <div className="event-details__flyer">
        <img
          src="http://www.bootiesonair.com/static/media/event.0ac92e65eff66d478724.png"
          alt="Event Flyer"
        />
      </div>
      <div className="event-details__info">
        {event ? (
          <>
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
              onClick={() => setShowEditEvent(true)}
            >
              Edit Event
            </button>
            <button
              className="view-event-page-button event-details__info__button"
              onClick={() => navigate(`/events/page/${event.link}`)}
            >
              View Event Page
            </button>
            {event.guestCode && (
              <button
                className="guest-code-settings-button event-details__info__button"
                onClick={() => setShowGuestCodeSettings(true)}
              >
                Guest Code Settings
              </button>
            )}

            <button
              className="delete-event-button event-details__info__button"
              onClick={handleDelete}
            >
              Delete Event
            </button>

            <Modal
              isOpen={showEditEvent}
              onClose={() => setShowEditEvent(false)}
              title="Edit Event"
            >
              <EditEvent
                event={event}
                onUpdate={(updatedEvent) => {
                  setEvent(updatedEvent);
                  setShowEditEvent(false);
                }}
                eventId={eventId}
              />
            </Modal>

            <Modal
              isOpen={showGuestCodeSettings}
              onClose={() => setShowGuestCodeSettings(false)}
              title="Guest Code Settings"
            >
              <GuestCodeSettings
                onConditionSave={(condition) => {
                  setEvent({ ...event, guestCodeCondition: condition });
                }}
                eventId={eventId}
                setShowGuestCodeSettings={setShowGuestCodeSettings}
              />
            </Modal>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
