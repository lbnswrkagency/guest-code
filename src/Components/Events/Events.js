import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import "./Events.scss";
import { getAllEvents } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";

const Events = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const refetchEvents = async () => {
      try {
        const fetchedEvents = await getAllEvents();

        if (user && user.events) {
          setEvents(
            fetchedEvents.filter((event) => user.events.includes(event._id))
          ); // Display only events created by the user
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    refetchEvents();
  }, [user]);

  const formatDate = (date) => {
    const eventDate = new Date(date);
    const options = {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    };
    return eventDate.toLocaleDateString("en-US", options);
  };

  return (
    <div className="events">
      <BackButton />
      <h1>Events</h1>
      <button
        className="create-event-button"
        onClick={() => navigate("/events/create")}
      >
        Create Event
      </button>
      <div className="event-list">
        {events.map((event, index) => (
          <Link to={`/events/${event._id}`} key={event._id}>
            <div className="event-item">
              <img
                src="http://www.bootiesonair.com/static/media/event.0ac92e65eff66d478724.png"
                alt="Event Flyer"
              />
              <div className="event-info">
                <h3>{event.title}</h3>
                <p className="event-date">
                  {formatDate(event.date)} | {event.time}
                </p>
                <p className="event-location">{event.location}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Events;
