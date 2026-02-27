import React, { useState, memo } from "react";
import { motion } from "framer-motion";
import {
  RiCalendarLine,
  RiTimeLine,
  RiMapPinLine,
  RiImageLine,
  RiStarLine,
  RiArrowUpLine,
  RiCalendarEventLine,
  RiVideoUploadLine,
} from "react-icons/ri";
import Tickets from "../Tickets/Tickets";
import GuestCode from "../GuestCode/GuestCode";
import TableSystem from "../TableSystem/TableSystem";
import BattleSign from "../BattleSign/BattleSign";
import Spotify from "../Spotify/Spotify";
import GalleryCarousel from "../GalleryCarousel/GalleryCarousel";
import MediaUpload from "../MediaUpload/MediaUpload";
import {
  getEventDate,
  formatDateWithYear,
  formatTime,
} from "../../utils/dateFormatters";
import { getEventImage } from "../../utils/eventHelpers";
import "./EventSummary.scss";

// Format date: "Saturday, Feb 15"
const formatEventDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

// Artist initials fallback
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Get best avatar URL from artist
const getArtistAvatar = (artist) => {
  const av = artist?.avatar;
  if (!av) return null;
  if (typeof av === "string") return av;
  return av.medium || av.small || av.thumbnail || av.full || av.large || null;
};

// Format category name with plural
const formatCategoryName = (category, count) => {
  if (count <= 1) return category.toUpperCase();
  if (category.toUpperCase().endsWith("S")) return category.toUpperCase();
  if (category.toUpperCase() === "DJ") return "DJS";
  return `${category.toUpperCase()}'S`;
};

const LoadingSpinner = () => (
  <div className="event-summary__spinner" />
);

const EventSummary = ({
  event,
  ticketSettings,
  visibleTicketSettings,
  loadingTickets,
  fetchTicketSettings,
  guestCodeSetting,
  brandId,
  brandUsername,
  brandHasGalleries,
  brandUploadSettings,
  showTableBooking,
  showBattleSignup,
  supportsTableBooking,
  supportsBattles,
  isSpotifyConfigured,
  spotifyLoaded,
  tableDataCache,
  onToggleTableBooking,
  onToggleBattleSignup,
  onSpotifyLoadChange,
  onGalleryStatusChange,
  onGalleryImageClick,
  ticketSectionRef,
  guestCodeSectionRef,
  tableBookingSectionRef,
  battleSignupSectionRef,
  gallerySectionRef,
}) => {
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  if (!event) return null;

  const eventImage = getEventImage(event);
  const eventDate = getEventDate(event);
  const formattedDate = formatEventDate(eventDate);
  const formattedTime = event.startTime ? formatTime(event.startTime) : "";
  const hasLineups = event.lineups && event.lineups.length > 0;
  const hasGenres = event.genres && event.genres.length > 0;
  const hasDescription = !!event.description;
  const hasAddress = event.street || event.address;
  const spotifyConfigured = isSpotifyConfigured(event);
  const hasTableBooking = supportsTableBooking(event);
  const hasBattles = supportsBattles(event);
  const hasTickets = visibleTicketSettings && visibleTicketSettings.length > 0;
  const hasGuestCode = guestCodeSetting?.isEnabled && guestCodeSetting?.condition;
  const canUpload = brandUploadSettings?.guestUploadEnabled && brandUploadSettings?.guestUploadFolder;

  // Group lineups by category (same logic as EventFeed/LineUpView)
  const groupedLineups = hasLineups
    ? event.lineups
        .filter((l) => l && l.name)
        .reduce((acc, artist) => {
          const category = artist.category || "Artists";
          if (!acc[category]) acc[category] = [];
          acc[category].push(artist);
          return acc;
        }, {})
    : {};

  // Sort categories: DJs first, then by count, then alphabetical
  const sortedCategories = Object.keys(groupedLineups).sort((a, b) => {
    if (a.toLowerCase() === "dj" || a.toLowerCase() === "djs") return -1;
    if (b.toLowerCase() === "dj" || b.toLowerCase() === "djs") return 1;
    const countDiff = groupedLineups[b].length - groupedLineups[a].length;
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Get brand logo for placeholder
  const getBrandLogo = () => {
    if (!event.brand) return null;
    if (typeof event.brand === "object") {
      const logo = event.brand.logo;
      if (!logo) return null;
      if (typeof logo === "string") return logo;
      return logo.medium || logo.full || logo.thumbnail || null;
    }
    return null;
  };

  return (
    <div className="event-summary">
      {/* Hero Image */}
      <div className="event-summary__hero">
        {eventImage ? (
          <img src={eventImage} alt={event.title || "Event flyer"} loading="lazy" />
        ) : getBrandLogo() ? (
          <img
            src={getBrandLogo()}
            alt={event.brand?.name || "Brand"}
            className="placeholder-logo"
            loading="lazy"
          />
        ) : (
          <div className="event-summary__no-image">
            <RiImageLine />
            <span>No image available</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="event-summary__content">
        {/* Date & Time */}
        <div className="event-summary__meta">
          {formattedDate && (
            <span className="event-summary__date">
              <RiCalendarLine />
              {formattedDate}
            </span>
          )}
          {formattedTime && (
            <span className="event-summary__time">
              <RiTimeLine />
              {formattedTime}
              {event.endTime && ` - ${formatTime(event.endTime)}`}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="event-summary__title">{event.title}</h1>

        {/* Subtitle */}
        {event.subTitle && (
          <p className="event-summary__subtitle">{event.subTitle}</p>
        )}

        {/* Location */}
        {event.location && (
          <div className="event-summary__location">
            <RiMapPinLine />
            <div>
              <span>{event.location}</span>
              {hasAddress && (
                <div className="event-summary__address">
                  {event.street || event.address}
                  {event.postalCode && `, ${event.postalCode}`}
                  {event.city && ` ${event.city}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {hasDescription && (
          <p className="event-summary__description">{event.description}</p>
        )}

        {/* Lineup */}
        {hasLineups && sortedCategories.length > 0 && (
          <div className="event-summary__lineup">
            <div className="event-summary__lineup-categories">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <span className="event-summary__lineup-category-name">
                    {formatCategoryName(category, groupedLineups[category].length)}
                  </span>
                  <div className="event-summary__lineup-artists">
                    {groupedLineups[category].map((artist, index) => {
                      const avatar = getArtistAvatar(artist);
                      return (
                        <div key={artist._id || index} className="event-summary__artist">
                          <div className="event-summary__artist-avatar">
                            {avatar ? (
                              <img src={avatar} alt={artist.name} loading="lazy" />
                            ) : (
                              <span className="event-summary__artist-initials">
                                {getInitials(artist.name)}
                              </span>
                            )}
                          </div>
                          <span className="event-summary__artist-name">
                            {artist.name}
                          </span>
                          {artist.subtitle && (
                            <span className="event-summary__artist-subtitle">
                              {artist.subtitle}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genres */}
        {hasGenres && (
          <div className="event-summary__genres">
            {event.genres.map((genre, index) => (
              <span key={genre._id || index} className="event-summary__genre">
                {typeof genre === "object" ? genre.name : genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sections below span full width */}
      {/* Tickets Section */}
      {event.ticketsAvailable !== false && hasTickets && (
        <div
          ref={ticketSectionRef}
          className="event-summary__section event-summary__section--tickets"
        >
          {loadingTickets ? (
            <div className="event-summary__ticket-loading">
              <LoadingSpinner />
              <span>Loading tickets...</span>
            </div>
          ) : (
            <Tickets
              eventId={event._id}
              eventTitle={event.title}
              eventDate={event.startDate}
              event={event}
              ticketSettings={visibleTicketSettings}
              fetchTicketSettings={fetchTicketSettings}
            />
          )}
        </div>
      )}

      {/* Battle Signup */}
      {hasBattles && (
        <div
          ref={battleSignupSectionRef}
          className="event-summary__section event-summary__section--battle"
          id={`battle-signup-${event._id}`}
        >
          <BattleSign eventId={event._id} ref={battleSignupSectionRef} />
        </div>
      )}

      {/* Guest Code */}
      {hasGuestCode && (
        <div
          ref={guestCodeSectionRef}
          className="event-summary__section event-summary__section--guest-code"
        >
          <GuestCode event={event} />
        </div>
      )}

      {/* Table Booking */}
      {hasTableBooking && showTableBooking && (
        <div
          ref={tableBookingSectionRef}
          className="event-summary__section event-summary__section--table"
          id="table-booking-section"
        >
          <TableSystem
            selectedEvent={event}
            selectedBrand={event.brand}
            isPublic={true}
            onClose={onToggleTableBooking}
            tableData={tableDataCache?.[event._id]}
          />
        </div>
      )}

      {/* Gallery Carousel */}
      {brandHasGalleries && (
        <div
          ref={gallerySectionRef}
          className="event-summary__section event-summary__section--gallery"
          id={`gallery-${event._id}`}
        >
          <GalleryCarousel
            brandId={brandId}
            brandUsername={brandUsername}
            currentEvent={event}
            brandHasGalleries={brandHasGalleries}
            onGalleryStatusChange={onGalleryStatusChange}
            onImageClick={(images, imageIndex) => {
              if (onGalleryImageClick) {
                onGalleryImageClick(images, imageIndex);
              }
            }}
          />
        </div>
      )}

      {/* Spotify */}
      {spotifyConfigured && spotifyLoaded !== false && (
        <div className="event-summary__section event-summary__section--spotify">
          <Spotify
            brandUsername={
              typeof event.brand === "object" && event.brand?.username
                ? event.brand.username
                : brandUsername
            }
            onLoadStatusChange={onSpotifyLoadChange}
          />
        </div>
      )}

      {/* Share Your Moments - Media Upload */}
      {canUpload && (
        <div className="event-summary__section event-summary__section--media-upload">
          {!showMediaUpload ? (
            <>
              <button
                type="button"
                className="event-summary__share-btn"
                onClick={() => setShowMediaUpload(true)}
              >
                <RiVideoUploadLine />
                <span>Share Your Moments</span>
              </button>
              <p className="event-summary__share-hint">
                Upload your videos and photos from the event
              </p>
            </>
          ) : (
            <MediaUpload
              brandId={event.brand?._id || event.brand}
              eventId={event._id}
              mode="public"
              onUploadComplete={() => setShowMediaUpload(false)}
              onClose={() => setShowMediaUpload(false)}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <motion.div
        className="event-summary__footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="event-summary__footer-content">
          <div className="event-summary__footer-info">
            <div className="event-summary__footer-logo">
              <RiStarLine className="logo-icon" />
              <span className="logo-text">
                <span className="brand-guest">Guest</span>
                <span className="brand-code">Code</span>
              </span>
            </div>

            <div className="event-summary__footer-event-info">
              <h4 className="event-title">{event.title}</h4>
              <div className="event-details">
                <div className="detail-item">
                  <RiCalendarEventLine className="detail-icon" />
                  <span>{formatDateWithYear(eventDate)}</span>
                </div>
                {event.location && (
                  <div className="detail-item">
                    <RiMapPinLine className="detail-icon" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.startTime && (
                  <div className="detail-item">
                    <RiTimeLine className="detail-icon" />
                    <span>
                      {event.startTime}
                      {event.endTime && ` - ${event.endTime}`}
                    </span>
                  </div>
                )}
              </div>


            </div>
          </div>

          <div className="event-summary__divider" />

          <button
            type="button"
            className="event-summary__back-to-top"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <RiArrowUpLine />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default memo(EventSummary);
