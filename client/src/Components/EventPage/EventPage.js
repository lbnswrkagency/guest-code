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
  const [loadingProgress, setLoadingProgress] = useState(0); // New state for loading progress
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [imageOpacity, setImageOpacity] = useState(1);
  const [isHiddenVisible, setIsHiddenVisible] = useState(false);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [areImagesLoaded, setAreImagesLoaded] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [loadedResources, setLoadedResources] = useState(0);

  const s3ImageUrls = Array.from(
    { length: 10 },
    (_, i) =>
      `https://guest-code.s3.eu-north-1.amazonaws.com/server/header-${String(
        i + 1
      ).padStart(2, "0")}.jpg`
  );

  const tempCarouselImages = s3ImageUrls;

  const allImageUrls = [
    ...tempCarouselImages,
    "https://guest-code.s3.eu-north-1.amazonaws.com/flyers/header.png",
  ];

  // Update totalResources

  // State to track each image load status
  const [imagesLoaded, setImagesLoaded] = useState(
    new Array(allImageUrls.length).fill(false)
  );

  const totalResources = allImageUrls.length + 1; // +1 for event data

  const navigate = useNavigate();
  const guestCodeRef = useRef(null);
  const eventRef = useRef(null);

  const contactRef = useRef(null);
  const explainRef = useRef(null);
  const locationRef = useRef(null);

  const dateRef = useRef(null);
  const address = "Dekeleon 26, Athens 11854";
  const googleMapsUrl = `geo:0,0?q=${encodeURIComponent(address)}`;

  const [copied, setCopied] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);

  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/babydisco24/", "_blank");
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
    allImageUrls.forEach((src, index) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImagesLoaded((prev) => {
          const newLoaded = [...prev];
          newLoaded[index] = true;
          return newLoaded;
        });
      };
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === tempCarouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [tempCarouselImages.length]);

  useEffect(() => {
    const allImagesLoaded = imagesLoaded.every(Boolean);
    if (allImagesLoaded && event) {
      setIsLoading(false);
    } else {
      const loadedCount = imagesLoaded.filter(Boolean).length;
      setLoadingProgress((loadedCount / totalResources) * 100);
    }
  }, [imagesLoaded, event]);

  useEffect(() => {
    let isMounted = true; // Flag to track mounting

    tempCarouselImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (isMounted) {
          setLoadedResources((prev) => prev + 1);
        }
      };
    });

    return () => {
      isMounted = false; // Clean up the flag on unmount
    };
  }, []); // Run only once when the component mounts

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await getEventByLink(eventLink);
        setEvent(response.event);
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoadedResources((prev) => prev + 1);
      }
    };

    fetchEvent();
  }, [eventLink]);

  useEffect(() => {
    if (loadedResources === totalResources) {
      setIsLoading(false);
    } else {
      setLoadingProgress((loadedResources / totalResources) * 100);
    }
  }, [loadedResources, totalResources]);

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
            <div class="loader">
              <div class="box1"></div>
              <div class="box2"></div>
              <div class="box3"></div>
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
              <div className="event-page-info-wrapper">
                <h2 className="event-page-info-subtitle">EVENT</h2>
                <h1 className="event-page-info-title">Afro Spiti</h1>
                <img
                  src="https://guest-code.s3.eu-north-1.amazonaws.com/server/eventinfo.png"
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
              <h1 className="event-page-location-title">BABY DISCO</h1>
              <img
                src="https://guest-code.s3.eu-north-1.amazonaws.com/server/BabyDisco_Spin.png"
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
                  <p>@Babydisco24</p>
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
          <p></p> // Placeholder for when event data is not available
        )}
      </div>
    </div>
  );
};

export default EventPage;
