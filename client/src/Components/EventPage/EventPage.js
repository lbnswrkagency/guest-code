import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./EventPage.scss";
import { getEventByLink } from "../../utils/apiClient";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo_w from "./carousel/logo_w.svg";
import qrCode from "./carousel/qrCode.svg";

const EventPage = ({ passedEventId }) => {
  const location = useLocation();
  const eventLink = passedEventId || location.pathname.split("/").pop();
  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const s3ImageUrls = Array.from(
    { length: 31 },
    (_, i) =>
      `https://guest-code.s3.eu-north-1.amazonaws.com/server/${String(
        i + 1
      ).padStart(2, "0")}.jpg`
  );
  const tempCarouselImages = s3ImageUrls;
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
    console.log("EVENT LINK", eventLink);
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
      toast.warn(
        "Please provide either an Email Address or a WhatsApp number."
      );
      return;
    }

    const loadingToastId = toast.loading("Generating Guest Code...");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/events/generateGuestCode`,
        {
          eventId: event._id,
          email,
          phone,
          name,
          condition: event.guestCodeCondition,
          pax: 1,
          paxChecked: 0,
        }
      );

      toast.update(loadingToastId, {
        render: "Guest Code generated and send.",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });

      // You might want to handle the response further here
    } catch (error) {
      console.error("Error generating guest code:", error);
      toast.update(loadingToastId, {
        render: "Error generating guest code. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  };
  const sliderSettings = {
    autoplay: true,
    speed: 1000,
    autoplaySpeed: 3000,
    cssEase: "cubic-bezier(0.455, 0.030, 0.515, 0.955)",
    slidesToShow: 2, // Default setting for screens wider than 999px
    slidesToScroll: 2,
    infinite: true,
    useTransform: true,
    adaptiveHeight: true,
    beforeChange: (current, next) => animateSlideChange(next),
    fade: false,
    responsive: [
      {
        breakpoint: 999, // Applies settings below this width
        settings: {
          slidesToShow: 1, // Show 1 image per slide for screens narrower than 1000px
          slidesToScroll: 1,
        },
      },
      // Additional breakpoints can be added here
    ],
  };

  console.log(event);

  return (
    <div className="event-page">
      <ToastContainer />
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
                    placeholder="WhatsApp Number"
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
          {/* 
          <footer className="event-page__footer">
            <h1 className="event-page__footer-title">{event.title}</h1>
            <h2 className="event-page__footer-subtitle">{event.subTitle}</h2>
          </footer> */}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default EventPage;
