import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import "./EventPage.scss";
import { getEventByLink } from "../../utils/apiClient";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo_w from "./carousel/logo_w.svg";
import qrCode from "./carousel/qrCode.svg";
import Spotify from "../Spotify/Spotify";
import Instagram from "../Instagram/Instagram";

const EventPage = ({ passedEventId }) => {
  const location = useLocation();
  const eventLink = passedEventId || location.pathname.split("/").pop();
  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0); // New state for loading progress
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [imageOpacity, setImageOpacity] = useState(1);

  const s3ImageUrls = Array.from(
    { length: 20 },
    (_, i) =>
      `https://guest-code.s3.eu-north-1.amazonaws.com/server/header-${String(
        i + 1
      ).padStart(2, "0")}.jpg`
  );
  const tempCarouselImages = s3ImageUrls;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await getEventByLink(eventLink);
        setEvent(response.event);
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEvent();
  }, [eventLink]);

  useEffect(() => {
    let loadedImages = 0;
    let isComponentMounted = true;

    const imageChangeInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === tempCarouselImages.length - 1 ? 0 : prevIndex + 1
      );
      setNextImageIndex((prevIndex) =>
        prevIndex === tempCarouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    tempCarouselImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (isComponentMounted) {
          loadedImages++;
          const progress = Math.round(
            (loadedImages / tempCarouselImages.length) * 100
          );
          setLoadingProgress(progress);
          if (loadedImages === tempCarouselImages.length) {
            setIsLoading(false);
          }
        }
      };
    });

    return () => {
      isComponentMounted = false;
      clearInterval(imageChangeInterval); // Clear interval on component unmount
    };
  }, [tempCarouselImages.length]);

  const handleGuestCodeFormSubmit = async (e) => {
    e.preventDefault();

    if (!email && !phone) {
      toast.warn("Please enter an email and your name.");
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
        render:
          response.data.message || "Check your Mails (+Spam). Thank you 🤝",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });

      // Clear the input fields
      setEmail("");
      setName("");
      setPhone("");

      // Additional handling if needed
    } catch (error) {
      console.error("Error generating guest code:", error);
      if (error.response && error.response.status === 400) {
        // If the status code is 400, show a hint instead of an error
        toast.update(loadingToastId, {
          render: error.response.data.error,
          type: "info",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        // For all other errors, show an error message
        toast.update(loadingToastId, {
          render:
            "There was a problem generating your guest code. Please try again.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    }
  };

  return (
    <div className="event-page">
      <ToastContainer />

      {isLoading ? (
        <div className="event-page-loading">
          <img src={logo_w} alt="Loading..." />
          <p style={{ color: "white", marginTop: "20px" }}>
            {loadingProgress}%
          </p>{" "}
        </div>
      ) : event ? (
        <>
          <header className="event-page-header">
            <img src={logo_w} alt="" className="event-page-header-logo" />
            <img src={qrCode} alt="" className="event-page-header-qr" />

            {event.guestCode && (
              <form
                className="event-page-header-guestcode"
                onSubmit={handleGuestCodeFormSubmit}
              >
                <div className="event-page-header-guestcode-form">
                  <div className="event-page-header-guestcode-condition">
                    <p>{event.guestCodeCondition}</p>
                  </div>
                  <input
                    type="text"
                    className="event-page-header-guestcode-form-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    required
                  />
                  <input
                    type="email"
                    className="event-page-header-guestcode-form-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                  />
                  {/* <p className="event-page-header-guestcode-form-separator">
                    OR
                  </p>
                  <input
                    type="text"
                    className="event-page-header-guestcode-form-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="WhatsApp Number"
                  /> */}
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
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <>
                  <img
                    src={tempCarouselImages[currentImageIndex]}
                    alt={`Flyer ${currentImageIndex + 1}`}
                    className="event-page-header-flyer-carousel"
                    style={{ opacity: imageOpacity }}
                  />
                  <img
                    src={tempCarouselImages[nextImageIndex]}
                    alt={`Flyer ${nextImageIndex + 1}`}
                    className="event-page-header-flyer-carousel2"
                    style={{ opacity: imageOpacity }}
                  />
                </>
              )}
            </div>
          </header>
          <Instagram />

          <Spotify />

          <footer className="event-page__footer">
            <img src={logo_w} alt="Loading..." />
          </footer>
        </>
      ) : (
        <p></p> // Placeholder for when event data is not available
      )}
    </div>
  );
};

export default EventPage;
