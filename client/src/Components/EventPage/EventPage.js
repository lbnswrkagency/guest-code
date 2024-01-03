import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  const [isHiddenVisible, setIsHiddenVisible] = useState(false);
  const navigate = useNavigate();
  const guestCodeRef = useRef(null);
  const eventRef = useRef(null);
  const socialRef = useRef(null);
  const locationRef = useRef(null);
  const spotifyRef = useRef(null);
  const dateRef = useRef(null);
  const address = "Dekeleon 26, Athens 11854";
  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    address
  )}&output=embed`;

  const [copied, setCopied] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);

  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  const copyAddressToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000); // Reset copied status after 2 seconds
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy address.");
    }
  };

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
    <div className="event-page-container">
      <p className="smartphone-message">USE YOUR SMARTPHONE</p>
      <ToastContainer />
      <div className="event-page">
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
              <div className="event-page-header-navigation">
                <img
                  src={isNavVisible ? "./image/close.svg" : "./image/menu.svg"}
                  alt={isNavVisible ? "Close" : "Menu"}
                  className="event-page-header-navigation-burger"
                  onClick={toggleNav}
                />
                <img
                  src="https://guest-code.s3.eu-north-1.amazonaws.com/server/spiti3d.png"
                  alt=""
                  className="event-page-header-navigation-logo"
                />
                <img
                  src="./image/login.svg"
                  alt=""
                  className="event-page-header-navigation-login"
                  onClick={() => navigate("/login")}
                />
              </div>

              <img
                src="https://guest-code.s3.eu-north-1.amazonaws.com/flyers/%2301.png"
                alt=""
                className="event-page-header-image"
              />

              <div className="event-page-header-footer">
                <div
                  className={`event-page-header-footer-hidden ${
                    isHiddenVisible ? "visible" : ""
                  }`}
                >
                  <div className="djs">
                    <p className="djs-title">DJs</p>
                    <div className="djs-single">
                      <img
                        src="./image/hulk.jpg"
                        alt=""
                        className="djs-single-image"
                      />
                      <p className="djs-single-name">Hulk</p>
                    </div>
                    <div className="djs-single">
                      <img
                        src="./image/hendricks.jpg"
                        alt=""
                        className="djs-single-image"
                      />
                      <p className="djs-single-name">Hendricks</p>
                    </div>
                    <div className="djs-single">
                      <img
                        src="./image/dimkay.jpg"
                        alt=""
                        className="djs-single-image"
                      />
                      <p className="djs-single-name">DIM KAY</p>
                    </div>
                  </div>
                  <div className="mc">
                    <p className="mc-title">MC</p>
                    <div className="mc-single">
                      <img
                        src="./image/jfyah.jpg"
                        alt=""
                        className="mc-single-image"
                      />
                      <p className="mc-single-name">J Fyah</p>
                    </div>
                  </div>
                </div>
                <div className="event-page-header-footer-lineup">
                  <svg className="event-page-header-footer-lineup-shadow"></svg>
                  <div>
                    <h5 className="lineup-title">LINE UP</h5>
                    <h4 className="lineup-event">Afro Spiti</h4>
                    <p>SUN 14 JAN 2024</p>
                  </div>
                  <img
                    src="./image/arrowup.svg"
                    alt=""
                    className={`event-page-header-footer-lineup-arrow ${
                      isHiddenVisible ? "rotated" : ""
                    }`}
                    onClick={() => setIsHiddenVisible((prev) => !prev)}
                  />
                </div>
                <div className="event-page-header-footer-buttons">
                  <button
                    onClick={() =>
                      guestCodeRef.current.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                  >
                    Generate GuestCode
                  </button>
                  <p>free entrance til midnight</p>
                </div>
              </div>
              {isNavVisible && (
                <div className="navigation-overlay">
                  <ul className="navigation-list">
                    <li
                      onClick={() => {
                        guestCodeRef.current.scrollIntoView({
                          behavior: "smooth",
                        });
                        setIsNavVisible(false); // Close the navigation overlay
                      }}
                    >
                      Guest Code
                    </li>
                    <li
                      onClick={() => {
                        dateRef.current.scrollIntoView({ behavior: "smooth" });
                        setIsNavVisible(false); // Close the navigation overlay
                      }}
                    >
                      Date & Time
                    </li>
                    <li
                      onClick={() => {
                        eventRef.current.scrollIntoView({ behavior: "smooth" });
                        setIsNavVisible(false); // Close the navigation overlay
                      }}
                    >
                      About Us
                    </li>

                    <li
                      onClick={() => {
                        locationRef.current.scrollIntoView({
                          behavior: "smooth",
                        });
                        setIsNavVisible(false); // Close the navigation overlay
                      }}
                    >
                      Location
                    </li>
                  </ul>
                </div>
              )}
              {/* <img src={qrCode} alt="" className="event-page-header-qr" /> */}
            </header>

            <div ref={dateRef} className="event-page-banner">
              <h1 className="event-page-banner-title">Afro Spiti</h1>
              <h3 className="event-page-banner-subtitle">
                Athens home of Afrobeats.
              </h3>
              <p className="event-page-banner-info">
                Sunday · 14.01.2024 · 10 PM
              </p>

              <div
                className="event-page-banner-location"
                onClick={copyAddressToClipboard}
              >
                <img src="./image/location.svg" alt="" />

                <p>
                  <b>Baby Disco</b> · Dekeleon 26 · Athens 118 54
                </p>
              </div>
            </div>

            <div className="event-page-slider">
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <>
                  <img
                    src={tempCarouselImages[currentImageIndex]}
                    alt={`Flyer ${currentImageIndex + 1}`}
                    className="event-page-slider-carousel"
                    style={{ opacity: imageOpacity }}
                  />
                </>
              )}
            </div>

            {event.guestCode && (
              <form
                ref={guestCodeRef}
                className="event-page-guestcode"
                onSubmit={handleGuestCodeFormSubmit}
              >
                <h1 className="event-page-guestcode-title">GUEST CODE</h1>
                <div className="event-page-guestcode-form">
                  <p className="event-page-guestcode-condition">
                    free entrance until midnight
                  </p>
                  <input
                    type="text"
                    className="event-page-guestcode-form-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    required
                  />
                  <input
                    type="email"
                    className="event-page-guestcode-form-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                  />
                </div>
                <button type="submit" className="event-page-guestcode-button">
                  Generate GuestCode
                </button>
              </form>
            )}
            <div ref={eventRef} className="event-page-info">
              <h2 className="event-page-info-subtitle">EVENT</h2>
              <h1 className="event-page-info-title">Afro Spiti</h1>
              <img
                src="https://guest-code.s3.eu-north-1.amazonaws.com/server/eventinfo.png"
                alt=""
                className="event-page-info-image"
              />
              <p className="event-page-info-text">
                Afro Spiti Athens – your go-to spot for the best Afro Dancehall
                and Amapiano vibes in the city, and we know how to keep the
                dance floor buzzing all night. It's more than just a party; it's
                where you feel the beat, enjoy great food, and have a fantastic
                time with friends. Come join us for a night of fun, dance to
                great music, and make memories. At Afro Spiti Athens, every
                night is about good vibes and great beats.
              </p>
            </div>

            <Instagram />

            <div ref={locationRef} className="event-page-location">
              <h2 className="event-page-location-subtitle">MAIN LOCATION</h2>
              <h1 className="event-page-location-title">BABY DISCO</h1>
              <img
                src="https://guest-code.s3.eu-north-1.amazonaws.com/server/BabyDisco_Spin.png"
                alt=""
                className="event-page-location-image"
              />

              <span
                style={{ cursor: "pointer" }}
                onClick={() => copyAddressToClipboard(address)}
                className="event-page-location-copy"
              >
                <p>click to copy</p>
                <img src="./image/copy.svg" alt="" />
                {address}
              </span>

              <iframe
                title="Event Location"
                src={googleMapsUrl}
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>

            <Spotify />

            <footer className="event-page__footer">
              <img src={logo_w} alt="" />
            </footer>
          </>
        ) : (
          <p></p> // Placeholder for when event data is not available
        )}
      </div>
    </div>
  );
};

export default EventPage;
