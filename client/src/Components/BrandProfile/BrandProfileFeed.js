import React from "react";
import { motion } from "framer-motion";
import { RiCalendarEventLine, RiTimeLine } from "react-icons/ri";

const BrandProfileFeed = ({ brand }) => {
  // This will be populated with actual events later
  const upcomingEvents = [];

  return (
    <div className="brand-profile-feed">
      {/* Upcoming Events Section */}
      <div className="feed-section upcoming-events">
        <h2 className="section-title">
          <RiCalendarEventLine />
          Upcoming Events
        </h2>

        <div className="events-list">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <motion.div
                key={event._id}
                className="event-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Event content will go here */}
              </motion.div>
            ))
          ) : (
            <div className="empty-state">
              <RiCalendarEventLine className="empty-icon" />
              <p>No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="feed-section activity-feed">
        <h2 className="section-title">
          <RiTimeLine />
          Recent Activity
        </h2>

        <div className="activity-list">
          <div className="empty-state">
            <RiTimeLine className="empty-icon" />
            <p>No recent activity</p>
            <span className="subtitle">
              Activities will appear here when the brand creates events or makes
              updates
            </span>
          </div>
        </div>
      </div>

      {/* Future sections can be added here */}
      {/* For example: Past Events, Media Gallery, Reviews, etc. */}
    </div>
  );
};

export default BrandProfileFeed;
