import React from "react";
import "./Statistic.scss";

function Statistic({ counts, onClose }) {
  return (
    <div className="statistic">
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <div className="statistic-count">
        <h2>FriendsCodes</h2>
        {counts.friendsCounts.map((count) => (
          <div key={count._id} className="statistic-count-each">
            {" "}
            <p className="statistic-count-each-name">{count._id}</p>
            <p className="statistic-count-each-number">{count.total}</p>
          </div>
        ))}
        <h2>GuestCodes</h2>
        <div className="statistic-count-each">
          <p className="statistic-count-each-name">Total</p>
          <p className="statistic-count-each-number">
            {counts.guestCounts.total}
          </p>
        </div>
        <div className="statistic-count-each">
          <p className="statistic-count-each-name">Used</p>
          <p className="statistic-count-each-number">
            {counts.guestCounts.used}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Statistic;
