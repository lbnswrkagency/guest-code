import React from "react";
import "./Statistic.scss";
import moment from "moment";

function Statistic({ counts, onClose, currentWeek, onPrevWeek, onNextWeek }) {
  // Calculate total FriendsCodes
  const totalFriendsCodes = counts.friendsCounts.reduce(
    (acc, curr) => acc + curr.total,
    0
  );
  return (
    <div className="statistic">
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>

      <div className="statistic-count">
        <div className="statistic-navigation">
          <button onClick={onPrevWeek}>Previous</button>
          <span>{currentWeek.format("DD MMM YYYY")}</span>{" "}
          <button onClick={onNextWeek}>Next</button>
        </div>
        <h2>FriendsCodes</h2>
        {counts.friendsCounts.map((count) => (
          <div key={count._id} className="statistic-count-each">
            <p className="statistic-count-each-name">{count._id}</p>
            <p className="statistic-count-each-number">Total: {count.total}</p>
            <p className="statistic-count-each-used">Used: {count.used}</p>
          </div>
        ))}
        <div className="statistic-count-each">
          <p className="statistic-count-each-name">Total</p>
          <p className="statistic-count-each-number">{totalFriendsCodes}</p>
        </div>
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
