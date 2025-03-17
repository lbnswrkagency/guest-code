import React, { useState } from "react";
import { RiCalendarEventLine } from "react-icons/ri";
import UpcomingEvent from "../UpcomingEvent";
import { useAuth } from "../../contexts/AuthContext";

const BrandProfileFeed = ({ brand }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [eventCount, setEventCount] = useState(0);

  console.log("[BrandProfileFeed] Received brand data:", {
    id: brand?._id,
    username: brand?.username,
    name: brand?.name,
    isAuthenticated,
    timestamp: new Date().toISOString(),
  });

  // Handle the event count update
  const handleEventsLoaded = (count) => {
    setEventCount(count);
  };

  return (
    <div className="brand-profile-feed">
      {/* Upcoming Events Section */}
      <div className="feed-section upcoming-events">
        <h2 className="section-title">
          <RiCalendarEventLine />
          {eventCount === 1 ? "Upcoming Event" : "Upcoming Events"}
        </h2>

        <div className="events-list">
          {isAuthenticated ? (
            <UpcomingEvent
              brandId={brand?._id}
              brandUsername={brand?.username}
              limit={5}
              seamless={true}
              onEventsLoaded={handleEventsLoaded}
            />
          ) : (
            <UpcomingEvent
              brandUsername={brand?.username}
              limit={5}
              seamless={true}
              onEventsLoaded={handleEventsLoaded}
            />
          )}
        </div>
      </div>

      {/* Future sections can be added here */}
    </div>
  );
};

export default BrandProfileFeed;
