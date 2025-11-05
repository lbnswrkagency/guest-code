import React from "react";
import "./Ranking.scss"; // Assume similar styling to Statistic.scss
import moment from "moment";

function Ranking({
  counts,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  onClose,
  user,
}) {
  const today = moment();
  const weekStart = today.clone().startOf("isoWeek"); // Consider your event's specific week start if different
  const weekEnd = today.clone().endOf("isoWeek");
  const isCurrentWeek =
    currentEventDate.isSameOrAfter(weekStart) &&
    currentEventDate.isSameOrBefore(weekEnd);

  const friendsCodesRanking = counts.friendsCounts
    .sort((a, b) => {
      const sortBy = currentEventDate.isBefore(moment()) ? "used" : "total";
      return b[sortBy] - a[sortBy];
    })

    .map((count, index) => ({
      rank: index + 1,
      name: count.name,
      total: currentEventDate.isBefore(moment()) ? count.used : count.total,
      avatar: count.avatar, // Assuming avatar URL is part of count or fetched separately
    }));

  const displayDate = currentEventDate.format("DD MMM YYYY");
  const isPastEvent = currentEventDate.isBefore(moment());

  return (
    <div className="ranking">
      <div className="login-back-arrow" onClick={onClose}>
        <img src="/image/back-icon.svg" alt="" />
      </div>

      <img className="logo-global" src="/image/logo.svg" alt="" />
      <h1 className="dashboard-header-title">Ranking</h1>

      {isCurrentWeek && (
        <>
          <p className="dashboard-header-subtitle">THIS WEEK'S PRICE</p>
          <p className="dashboard-header-price">
            Apple AirPods (2nd generation)
          </p>
          <img
            className="dashboard-header-image"
            src="/image/price.png"
            alt=""
          />
        </>
      )}

      <div className="ranking-header">
        <div className="statistic-navigation">
          <button
            onClick={onPrevWeek}
            disabled={isStartingEvent}
            style={{ opacity: isStartingEvent ? 0 : 1 }}
          >
            &#8592;
          </button>
          <p>{displayDate}</p>
          <button onClick={onNextWeek}>&#8594;</button>
        </div>
      </div>
      <div className="ranking-list">
        {friendsCodesRanking.map(({ rank, name, total, avatar }) => (
          <div
            key={rank}
            className={`ranking-item ${
              isPastEvent && rank === 1 ? "winner-container" : ""
            }`}
          >
            <p className="ranking-item-rank">{rank}.</p>
            <img
              src={avatar || "/image/profile-icon.svg"}
              alt="Profile"
              className="ranking-item-avatar"
            />

            <span className="ranking-item-name">{name}</span>
            <span
              className={`ranking-item-total ${
                isPastEvent && rank === 1 ? "winner" : ""
              } ${isPastEvent ? "used" : ""}`}
            >
              {total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Ranking;
