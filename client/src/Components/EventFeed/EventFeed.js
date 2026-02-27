import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RiMapPinLine, RiCalendarLine, RiTimeLine } from "react-icons/ri";
import GalleryCarousel from "../GalleryCarousel/GalleryCarousel";
import EventGallery from "../EventGallery/EventGallery";
import "./EventFeed.scss";

// Format date nicely: "Saturday, Feb 15"
const formatEventDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

// Format time: "23:00"
const formatEventTime = (timeString) => {
  if (!timeString) return "";
  return timeString;
};

// Get artist initials for fallback avatar
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const EventFeed = ({ event, brand }) => {
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [hasGallery, setHasGallery] = useState(true); // optimistic, carousel self-hides

  const handleGalleryImageClick = useCallback((images, imageIndex) => {
    setGalleryImages(images);
    setGalleryInitialIndex(imageIndex);
    setShowGallery(true);
  }, []);

  const handleGalleryStatusChange = useCallback((hasImages) => {
    setHasGallery(hasImages);
  }, []);

  if (!event) {
    return (
      <div className="event-feed event-feed--empty">
        <div className="event-feed__empty-state">
          <p>No event selected</p>
        </div>
      </div>
    );
  }

  // Get best flyer (prefer portrait > square > landscape)
  const flyer =
    event?.flyer?.portrait?.medium ||
    event?.flyer?.portrait?.full ||
    event?.flyer?.square?.medium ||
    event?.flyer?.square?.full ||
    event?.flyer?.landscape?.medium ||
    event?.flyer?.landscape?.full ||
    brand?.logo ||
    null;

  // Get artist avatar
  const getArtistAvatar = (artist) => {
    return artist?.avatar?.medium || artist?.avatar?.small || artist?.avatar?.thumbnail || null;
  };
  const formattedDate = formatEventDate(event?.startDate);
  const formattedTime = formatEventTime(event?.startTime);
  const hasLineups = event?.lineups && event.lineups.length > 0;
  const hasGenres = event?.genres && event.genres.length > 0;

  // Group lineups by category
  const groupedLineups = hasLineups
    ? event.lineups.reduce((acc, artist) => {
        const category = artist.category || "Artists";
        if (!acc[category]) acc[category] = [];
        acc[category].push(artist);
        return acc;
      }, {})
    : {};

  return (
    <motion.div
      className="event-feed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Image */}
      {flyer && (
        <div className="event-feed__hero">
          <img src={flyer} alt={event?.title || "Event flyer"} loading="lazy" />
        </div>
      )}

      {/* Content */}
      <div className="event-feed__content">
        {/* Date & Time */}
        <div className="event-feed__meta">
          {formattedDate && (
            <span className="event-feed__date">
              <RiCalendarLine />
              {formattedDate}
            </span>
          )}
          {formattedTime && (
            <span className="event-feed__time">
              <RiTimeLine />
              {formattedTime}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="event-feed__title">{event?.title}</h1>

        {/* Subtitle */}
        {event?.subTitle && (
          <p className="event-feed__subtitle">{event.subTitle}</p>
        )}

        {/* Location */}
        {event?.location && (
          <div className="event-feed__location">
            <RiMapPinLine />
            <span>{event.location}</span>
          </div>
        )}

        {/* Lineup with avatars and categories */}
        {hasLineups && (
          <div className="event-feed__lineup">
            <div className="event-feed__lineup-categories">
              {Object.entries(groupedLineups).map(([category, artists]) => {
                // Add 'S for plural (e.g., "DJ" -> "DJ'S" when multiple)
                const categoryLabel = artists.length > 1 ? `${category}'S` : category;
                return (
                <div key={category} className="event-feed__lineup-category">
                  <span className="event-feed__lineup-category-name">{categoryLabel}</span>
                  <div className="event-feed__lineup-artists">
                    {artists.map((artist, index) => {
                      const avatar = getArtistAvatar(artist);
                      return (
                        <div key={artist._id || index} className="event-feed__artist">
                          <div className="event-feed__artist-avatar">
                            {avatar ? (
                              <img src={avatar} alt={artist.name} loading="lazy" />
                            ) : (
                              <span className="event-feed__artist-initials">
                                {getInitials(artist.name)}
                              </span>
                            )}
                          </div>
                          <span className="event-feed__artist-name">
                            {artist.name || artist}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Music Genres */}
        {hasGenres && (
          <div className="event-feed__genres">
            {event.genres.map((genre, index) => (
              <span key={genre._id || index} className="event-feed__genre">
                {genre.name || genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Carousel */}
      {brand && (
        <div className="event-feed__gallery">
          <GalleryCarousel
            brandId={brand._id}
            brandUsername={brand.username}
            currentEvent={event}
            brandHasGalleries={hasGallery}
            onGalleryStatusChange={handleGalleryStatusChange}
            onImageClick={handleGalleryImageClick}
          />
        </div>
      )}

      {/* EventGallery Lightbox */}
      <EventGallery
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </motion.div>
  );
};

export default EventFeed;
