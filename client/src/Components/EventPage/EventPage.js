import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./EventPage.scss";
import { getEventByLink } from "../../utils/apiClient";
import axios from "axios";

import image1 from "./carousel/1.png";
import image2 from "./carousel/2.png";
import image3 from "./carousel/3.png";
import image4 from "./carousel/4.png";
import logo_w from "./carousel/logo_w.svg";
import qrCode from "./carousel/qrCode.svg";

const EventPage = ({ passedEventId }) => {
  const location = useLocation();
  const eventLink = passedEventId || location.pathname.split("/").pop();
  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const tempCarouselImages = [image1, image2, image3, image4];

  function animateSlideChange(nextIndex) {
    const slides = document.querySelectorAll(".slick-slide"); // Selector might need adjustment

    slides.forEach((slide, index) => {
      if (index === nextIndex) {
        slide.style.transition = "transform 1s ease-in-out";
        slide.style.transform = "rotateY(-20deg) scale(1.1)";
      } else {
        slide.style.transform = "rotateY(0deg) scale(1)";
      }
    });
  }

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await getEventByLink(eventLink);

        setEvent(response.event); // Set event directly with the fetched event data
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEvent();
  }, [eventLink]);
  const handleGuestCodeFormSubmit = async (e) => {
    e.preventDefault();

    if (!email && !phone) {
      alert("Please provide either an email address or a phone number.");
      return;
    }

    try {
      const response = await axios.post("/api/events/generateGuestCode", {
        eventId: event._id,
        email,
        phone,
        name,
        condition: event.guestCodeCondition,
        pax: 1,
        paxChecked: 0,
      });

      alert("Guest code generated and QR code sent.");
      // You might want to handle the response further here
    } catch (error) {
      console.error("Error generating guest code:", error);
      alert("Error generating guest code. Please try again.");
    }
  };

  // Slider settings
  const sliderSettings = {
    autoplay: true,
    speed: 1000,
    autoplaySpeed: 3000,
    cssEase: "cubic-bezier(0.455, 0.030, 0.515, 0.955)", // Custom easing for a unique transition
    slidesToShow: 1,
    slidesToScroll: 1,
    infinite: true,
    useTransform: true, // Enable transform for better performance
    adaptiveHeight: true, // Adjust height based on each slide's content
    beforeChange: (current, next) => animateSlideChange(next), // Custom function to animate slides
    fade: false, // Disable fade to allow custom animations
  };

  console.log(event);

  return (
    <div className="event-page">
      {/* <BackButton /> */}

      {event ? (
        <>
          <header className="event-page-header">
            <img src={logo_w} alt="" className="event-page-header-logo" />
            <img src={qrCode} alt="" className="event-page-header-qr" />
            {event.guestCode && (
              <form
                className="event-page-header-guestcode"
                onSubmit={handleGuestCodeFormSubmit}
              >
                {" "}
                <div className="event-page-header-guestcode-form">
                  <input
                    type="text"
                    className="event-page-header-guestcode-form-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    className="event-page-header-guestcode-form-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                  />

                  <p className="event-page-header-guestcode-form-separator">
                    OR
                  </p>
                  <input
                    type="text"
                    className="event-page-header-guestcode-form-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                  />
                </div>
                <div className="event-page-header-guestcode-condition">
                  <p>{event.guestCodeCondition}</p>
                </div>
                <button
                  type="submit"
                  className="event-page-header-guestcode-button"
                >
                  GENERATE GUEST CODE
                </button>
              </form>
            )}
            <div className="event-page-header-flyer">
              {tempCarouselImages.length > 0 ? (
                <Slider {...sliderSettings}>
                  {tempCarouselImages.map((image, index) => (
                    <div key={index}>
                      <img src={image} alt={`Flyer ${index + 1}`} />
                    </div>
                  ))}
                </Slider>
              ) : (
                <img
                  src={
                    event.flyer && event.flyer.instagramStory
                      ? event.flyer.instagramStory
                      : `https://guestcode.s3.eu-north-1.amazonaws.com/flyers/16x9.svg`
                  }
                  alt={`${event.title} flyer`}
                />
              )}
            </div>
          </header>

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
