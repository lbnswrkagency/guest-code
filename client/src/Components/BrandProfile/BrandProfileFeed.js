import React from "react";
import { RiCalendarEventLine } from "react-icons/ri";
import UpcomingEvent from "../UpcomingEvent";
import { useAuth } from "../../contexts/AuthContext";

const BrandProfileFeed = ({ brand }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  console.log("[BrandProfileFeed] Received brand data:", {
    id: brand?._id,
    username: brand?.username,
    name: brand?.name,
    isAuthenticated,
    timestamp: new Date().toISOString(),
  });

  return (
    <div className="brand-profile-feed">
      {/* Upcoming Events Section */}
      <div className="feed-section upcoming-events">
        <h2 className="section-title">
          <RiCalendarEventLine />
          Upcoming Events
        </h2>

        <div className="events-list">
          {isAuthenticated ? (
            <UpcomingEvent
              brandId={brand?._id}
              brandUsername={brand?.username}
              limit={5}
              seamless={true}
            />
          ) : (
            <UpcomingEvent
              brandUsername={brand?.username}
              limit={5}
              seamless={true}
            />
          )}
        </div>
      </div>

      {/* Future sections can be added here */}
    </div>
  );
};

export default BrandProfileFeed;
