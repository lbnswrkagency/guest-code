// DashboardHeader.js
import React, { useEffect } from "react";
import AvatarUpload from "../AvatarUpload/AvatarUpload.";
import "./DashboardHeader.scss";

const DashboardHeader = ({
  user,
  isEditingAvatar,
  toggleEditAvatar,
  setIsCropMode,
  isCropMode,
  setUser,
  isOnline,
}) => {
  useEffect(() => {
    console.log("[DashboardHeader] Online status updated:", isOnline);
  }, [isOnline]);

  return (
    <div className="headerDashboard">
      <div className="headerDashboard-avatar">
        {!isEditingAvatar ? (
          <div className="headerDashboard-avatar-wrapper">
            <img
              src="/image/share-icon.svg"
              alt="Edit Avatar"
              className="share-icon"
              onClick={toggleEditAvatar}
            />
            <img src={user.avatar} alt="Profile" className="profile-icon" />
            <img
              src="/image/edit-icon2.svg"
              alt="Edit Avatar"
              className="edit-icon"
              onClick={toggleEditAvatar}
            />
          </div>
        ) : (
          <>
            <AvatarUpload
              user={user}
              setUser={setUser}
              setIsCropMode={setIsCropMode}
              toggleEditAvatar={toggleEditAvatar}
            />
            {!isCropMode && (
              <img
                src="/image/cancel-icon_w.svg"
                alt="Cancel Edit"
                className="avatar-cancel-icon avatar-icon"
                onClick={toggleEditAvatar}
              />
            )}
          </>
        )}
      </div>

      <div className="headerDashboard-info">
        <p className="headerDashboard-info-name">
          {user.firstName ? `${user.firstName}` : `@${user.username}`}
        </p>
      </div>

      <div className="headerDashboard-selection">
        <div className="headerDashboard-selection-event">
          <span className="headerDashboard-selection-event-image">
            <img src="/image/logo.svg" alt="" />
          </span>
          <h2 className="headerDashboard-selection-event-name">Afro Spiti</h2>
          <img
            src="/image/dropdown-icon.svg"
            alt=""
            className="headerDashboard-selection-event-dropdown"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
