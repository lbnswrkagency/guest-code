import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./EventPage.scss";
import { getEventByLink } from "../../utils/apiClient";
import BackButton from "../BackButton/BackButton";
import axios from "axios";

const EventPage = () => {
  const location = useLocation();
  const eventLink = location.pathname.split("/").pop();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await getEventByLink(eventLink);

        console.log(response);
        setEvent(response.event); // Set event directly with the fetched event data
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEvent();
  }, [eventLink]);

  const handleGuestCodeFormSubmit = async (e) => {
    e.preventDefault();

    const name = e.target.name.value;

    const email = e.target.email.value;

    // Check if name and email are not empty
    if (!name || !email) {
      alert("Please provide a name and an email address.");
      return;
    }

    const condition = "5€ Discount til midnight";
    const pax = 1;
    const paxChecked = 0;

    try {
      await axios.post("/api/events/generateGuestCode", {
        eventId: event._id,
        name,
        email,
        condition,
        pax,
        paxChecked,
      });

      alert("Guest code generated and QR code sent.");
    } catch (error) {
      console.error("Error generating guest code:", error);
      alert("Error generating guest code. Please try again.");
    }
  };

  return (
    <div className="event-page">
      <BackButton />
      {event ? (
        <>
          <header className="event-page__header">
            <div className="event-page__flyer">
              <img
                src="http://www.bootiesonair.com/static/media/event.0ac92e65eff66d478724.png"
                alt={`${event.title} flyer`}
              />
            </div>
            <h1 className="event-page__title">{event.title}</h1>
            <h2 className="event-page__subtitle">{event.subTitle}</h2>
            <div className="event-page__date-time-location">
              <span className="event-page__date">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
              <span className="event-page__time">{event.time}</span>
              <span className="event-page__location">{event.location}</span>
            </div>
          </header>

          <section className="event-page__content">
            <div className="event-page__text-video">
              {event.text && (
                <div className="event-page__text">
                  <p>{event.text}</p>
                </div>
              )}
              {event.video && (
                <div className="event-page__video">
                  <iframe
                    title="event-video"
                    src="http://fyped.de/sample.mp4"
                    // allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="event-page__video-iframe"
                  ></iframe>
                </div>
              )}
            </div>
          </section>

          {event.ticketCode && (
            <section className="event-page__tickets">
              {/* Display ticket options */}
            </section>
          )}

          {event.guestCode && (
            <section className="event-page__guest-code form-section">
              <h3 className="guest-code__title">Generate Guest Code</h3>
              <form
                className="guest-code__form"
                onSubmit={handleGuestCodeFormSubmit}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  className="guest-code__input"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="guest-code__input"
                />
                <button type="submit" className="guest-code__submit-btn">
                  Generate Guest Code
                </button>
              </form>
            </section>
          )}

          {event.tableCode && (
            <section className="event-page__table-code form-section">
              {/* Add the form for table reservations */}
            </section>
          )}

          <footer className="event-page__footer">
            <h1 className="event-page__footer-title">{event.title}</h1>
            <h2 className="event-page__footer-subtitle">{event.subTitle}</h2>
          </footer>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default EventPage;
