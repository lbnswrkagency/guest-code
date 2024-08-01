import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "./EventPage.scss";
import { getEventByLink } from "../../utils/apiClient";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import logo_w from "./carousel/logo_w.svg";
import Spotify from "../Spotify/Spotify";
import Instagram from "../Instagram/Instagram";
import Explain from "../Explain/Explain";

const EventPage = ({ passedEventId }) => {
  const location = useLocation();
  const eventLink = passedEventId || location.pathname.split("/").pop();
  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [imageOpacity, setImageOpacity] = useState(1);
  const [isHiddenVisible, setIsHiddenVisible] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedResources, setLoadedResources] = useState(0);

  const sliderImages = Array.from(
    { length: 10 },
    (_, i) =>
      `/pageContent/slider/header-bolivar-${String(i + 1).padStart(2, "0")}.jpg`
  );

  const tempCarouselImages = sliderImages;

  const criticalResources = [
    ...sliderImages,
    "/pageContent/header/HEADER31072024.png",
    "/pageContent/header/spiti3d.png",
    "/pageContent/rest/FEEL.png",
    "/pageContent/rest/LOCATION.png",
  ];

  const navigate = useNavigate();
  const guestCodeRef = useRef(null);
  const eventRef = useRef(null);

  const contactRef = useRef(null);
  const explainRef = useRef(null);
  const locationRef = useRef(null);

  const dateRef = useRef(null);

  const address = "Bolivar Beach Bar";
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;

  const [copied, setCopied] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);

  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/bolivarbeachbar/", "_blank");
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

  useEffect(() => {
    let isMounted = true;
    const loadTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        setIsLoading(false);
      }
    }, 15000); // 15 seconds timeout

    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve; // Count error as loaded to avoid getting stuck
      });
    };

    const loadAllResources = async () => {
      for (const src of criticalResources) {
        if (!isMounted) break;
        await loadImage(src);
        if (isMounted) {
          setLoadedResources((prev) => prev + 1);
        }
      }
    };

    const fetchEvent = async () => {
      try {
        const response = await getEventByLink(eventLink);
        if (isMounted) {
          setEvent(response.event);
          setLoadedResources((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        if (isMounted) {
          setLoadedResources((prev) => prev + 1); // Count error as loaded
        }
      }
    };

    loadAllResources();
    fetchEvent();

    return () => {
      isMounted = false;
      clearTimeout(loadTimeout);
    };
  }, [eventLink]);

  useEffect(() => {
    const progress = Math.min(
      (loadedResources / (criticalResources.length + 1)) * 100,
      100
    );
    setLoadingProgress(progress);
    if (progress === 100 && event) {
      setIsLoading(false);
    }
  }, [loadedResources, criticalResources.length, event]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === tempCarouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
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

  const handleContactFormSubmit = async (e) => {
    e.preventDefault();

    if (!contactEmail || !contactName || !contactMessage) {
      toast.warn("Please fill in all fields.");
      return;
    }

    const loadingToastId = toast.loading("Sending Message...");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/contact/send`,
        {
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }
      );

      toast.update(loadingToastId, {
        render: response.data.message,
        type: toast.TYPE.SUCCESS,
        isLoading: false,
        autoClose: 5000,
      });

      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.update(loadingToastId, {
        render: "Failed to send message. Please try again later.",
        type: toast.TYPE.ERROR,
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  return (
    <div className="event-page-container">
      <p className="smartphone-message">USE YOUR SMARTPHONE</p>
      <ToastContainer />
      <div className="event-page">
        {isLoading ? (
          <div className="event-page-loading">
            <p>AFRO SPITI</p>
            <div className="loader">
              <div className="box1"></div>
              <div className="box2"></div>
              <div className="box3"></div>
            </div>
            <p style={{ color: "white", marginTop: "20px" }}>
              loading... {Math.round(loadingProgress)}%
            </p>
          </div>
        ) : event ? (
          <>
            <header className="event-page-header">
              <div className="event-page-header-navigation">
                <img
                  src={
                    isNavVisible
                      ? "./image/close.svg"
                      : "./image/menu_black.svg"
                  }
                  alt={isNavVisible ? "Close" : "Menu"}
                  className="event-page-header-navigation-burger"
                  onClick={toggleNav}
                />

                <img
                  src="/pageContent/header/spiti3d.png"
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
                src="/pageContent/header/HEADER31072024.png"
                alt=""
                className="event-page-header-image"
              />

              <div className="event-page-header-footer">
                <div
                  className={`event-page-header-footer-hidden ${
                    isHiddenVisible ? "visible" : ""
                  }`}
                >
                  <div className="lineup">
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
                    <div className="djs">
                      <p className="djs-title">DJs</p>

                      {/* <div className="djs-single djs-single-guest">
                        <img
                          src="./image/hulk.jpg"
                          alt=""
                          className="djs-single-image"
                        />
                        <p className="djs-single-name">Hulk</p>
                        <p className="origin">BELGIUM</p>
                      </div>

                      <div className="djs-single djs-single-guest">
                        <img
                          src="./image/hendricks.jpg"
                          alt=""
                          className="djs-single-image"
                        />
                        <p className="djs-single-name">Hendricks</p>
                        <p className="origin">BERLIN</p>
                      </div> */}

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
                          src="./image/paco.png"
                          alt=""
                          className="djs-single-image"
                        />
                        <p className="djs-single-name">Paco</p>
                      </div>
                      <div className="djs-single">
                        <img
                          src="./image/dimkay.jpg"
                          alt=""
                          className="djs-single-image"
                        />
                        <p className="djs-single-name">Dim Kay</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="event-page-header-footer-lineup">
                  <svg className="event-page-header-footer-lineup-shadow"></svg>

                  <div>
                    <h5 className="lineup-title">LINE UP</h5>
                    <h4 className="lineup-event">Afro Spiti</h4>
                    <p>WED 07 AUGUST 2024</p>
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

                  <p>free entrance til 23H</p>
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
                    <li
                      onClick={() => {
                        contactRef.current.scrollIntoView({
                          behavior: "smooth",
                        });
                        setIsNavVisible(false); // Close the navigation overlay
                      }}
                    >
                      Contact
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
                Wednesday · 07.08.2024 · 09 PM
              </p>

              <div
                className="event-page-banner-location"
                onClick={copyAddressToClipboard}
              >
                <img src="./image/location.svg" alt="" />

                <p>
                  <b>Bolivar</b> · Leof. Poseidonos · Alimos 174 55
                </p>
              </div>
            </div>
            <Explain />
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
                    free entrance until 23H
                  </p>
                  <p>BOLIVAR - Wednesday - 07.08.2024</p>
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
              <div className="event-page-info-wrapper">
                <h2 className="event-page-info-subtitle">EVENT</h2>
                <h1 className="event-page-info-title">Afro Spiti</h1>
                <img
                  src="/pageContent/rest/FEEL.png"
                  alt=""
                  className="event-page-info-image"
                />
                <p className="event-page-info-text">
                  Afro Spiti Athens – your go-to spot for the best Afro
                  Dancehall and Amapiano vibes in the city, and we know how to
                  keep the dance floor buzzing all night. It's more than just a
                  party; it's where you feel the beat, enjoy great food, and
                  have a fantastic time with friends. Come join us for a night
                  of fun, dance to great music, and make memories. At Afro Spiti
                  Athens, every night is about good vibes and great beats.
                </p>
              </div>
            </div>
            <Instagram />
            <div ref={locationRef} className="event-page-location">
              <h2 className="event-page-location-subtitle">MAIN LOCATION</h2>
              <img
                src="/image/bolivar.svg"
                alt=""
                className="event-page-location-logo"
              />
              <img
                src="/pageContent/rest/LOCATION.png"
                alt=""
                className="event-page-location-image"
              />

              <div className="event-page-location-button">
                <button
                  style={{ cursor: "pointer" }}
                  onClick={() => window.open(googleMapsUrl, "_blank")}
                  className="event-page-location-button-maps"
                >
                  <img src="./image/maps.svg" alt="" />
                  <p>{address}</p>
                </button>

                <button
                  className="event-page-location-button-instagram"
                  onClick={handleInstagramClick}
                >
                  <img src="./image/ig_button.svg" alt="" />
                  <p>@bolivarbeachbar</p>
                </button>
              </div>
            </div>
            <Spotify />
            <div className="event-page-contact" ref={contactRef}>
              <h2 className="event-page-contact-title">Contact Us</h2>
              <h4 className="event-page-contact-subtitle">Support</h4>
              <form
                className="event-page-contact-form"
                onSubmit={handleContactFormSubmit}
              >
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Name"
                  required
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="E-Mail"
                  required
                />
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Message"
                  required
                />
                <button type="submit">Send</button>
              </form>
            </div>
            <footer className="event-page__footer">
              <img src={logo_w} alt="" />
            </footer>
          </>
        ) : (
          <p></p>
        )}
      </div>
    </div>
  );
};

export default EventPage;
