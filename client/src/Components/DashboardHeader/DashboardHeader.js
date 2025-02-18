// DashboardHeader.js
import React, { useState } from "react";
import { motion } from "framer-motion";
import { RiCalendarEventLine, RiArrowDownSLine } from "react-icons/ri";
import "./DashboardHeader.scss";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import AvatarUpload from "../AvatarUpload/AvatarUpload";

const DashboardHeader = ({ user, setUser }) => {
  const { isConnected, onlineUsers } = useSocket();
  const { user: authUser } = useAuth();
  const [isCropMode, setIsCropMode] = useState(false);

  // Sample data (replace with real data later)
  const stats = {
    members: 25,
    brands: 1,
    events: 23,
  };

  const formatStatLabel = (value, singular, plural) => {
    return value === 1 ? singular : plural;
  };

  return (
    <div className="dashboard-header">
      <div className="header-content">
        {/* Profile Section */}
        <div className="profile-section">
          <AvatarUpload
            user={user}
            setUser={setUser}
            isCropMode={isCropMode}
            setIsCropMode={setIsCropMode}
            isOnline={isConnected}
          />

          <div className="user-info">
            <div className="user-info-main">
              <div className="name-group">
                <h1 className="display-name">{user.firstName}</h1>
                <span className="username">@{user.username}</span>
              </div>
              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-value">{stats.members}</span>{" "}
                  {formatStatLabel(stats.members, "Member", "Members")}
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">{stats.brands}</span>{" "}
                  {formatStatLabel(stats.brands, "Brand", "Brands")}
                </div>
                <div className="stat-divider">·</div>
                <div className="stat-item">
                  <span className="stat-value">{stats.events}</span>{" "}
                  {formatStatLabel(stats.events, "Event", "Events")}
                </div>
              </div>
              <div className="user-bio">Event Manager at GuestCode 🎫</div>
            </div>
          </div>
        </div>

        {/* Event Section */}
        <div className="event-section">
          <motion.div
            className="event-selector"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <div className="event-logo">
              <img src="/image/logo.svg" alt="Event Logo" />
            </div>
            <h2 className="event-name">Afro Spiti</h2>
            <motion.div
              className="dropdown-icon"
              initial={false}
              whileHover={{ y: 2 }}
              transition={{ duration: 0.2 }}
            >
              <RiArrowDownSLine />
            </motion.div>
          </motion.div>
        </div>

        {/* Date Section */}
        <div className="date-section">
          <motion.div
            className="date-display"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <RiCalendarEventLine className="calendar-icon" />
            <span>23 Mar 2024</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
