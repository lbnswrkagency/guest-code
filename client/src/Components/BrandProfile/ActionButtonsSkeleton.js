import React from "react";
import "./ActionButtonsSkeleton.scss";

const ActionButtonsSkeleton = () => {
  return (
    <div className="brand-event-actions skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton-pill" />
      ))}
    </div>
  );
};

export default ActionButtonsSkeleton;
