import React, { useState, memo } from "react";
import { RiCalendarEventLine } from "react-icons/ri";
import UpcomingEvent from "../UpcomingEvent";
import { useAuth } from "../../contexts/AuthContext";

const BrandProfileFeed = ({ brand, onEventChange, onEventsLoaded, initialDateHint }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [eventCount, setEventCount] = useState(0);

  // Handle the event count update
  const handleEventsLoaded = (count) => {
    setEventCount(count);
    // Pass the count to parent BrandProfile
    if (onEventsLoaded) {
      onEventsLoaded(count);
    }
  };

  return (
    <div className="brand-profile-feed">
      {/* Upcoming Events Section */}
      <div className="feed-section upcoming-events">
        <div className="events-list">
          <UpcomingEvent
            brandId={brand?._id}
            brandUsername={brand?.username}
            limit={5}
            seamless={true}
            onEventsLoaded={handleEventsLoaded}
            onEventChange={onEventChange}
            initialDateHint={initialDateHint}
          />
        </div>
      </div>

      {/* Future sections can be added here */}
    </div>
  );
};

export default memo(BrandProfileFeed);
