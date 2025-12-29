import React from "react";
import "./ActionButtonsSkeleton.scss";

const ActionButtonsSkeleton = () => {
  return (
    <div className="brand-event-actions skeleton">
      {/* Render 3-4 skeleton buttons since most events have at least this many */}
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="event-action-button skeleton-button">
          <div className="button-content">
            <div className="button-icon">
              <div className="skeleton-icon" />
            </div>
            <div className="button-text">
              <div className="skeleton-text">
                <div className="skeleton-line skeleton-line-title" />
                <div className="skeleton-line skeleton-line-subtitle" />
              </div>
            </div>
            <div className="button-arrow">
              <div className="skeleton-arrow" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActionButtonsSkeleton;