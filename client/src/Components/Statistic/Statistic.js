import React from "react";
import "./Statistic.scss";
import moment from "moment";

function Statistic({
  counts,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  onClose,
  user,
}) {
  const totalFriendsCodes = counts.friendsCounts.reduce(
    (acc, curr) => acc + curr.total,
    0
  );
  const totalUsedFriendsCodes = counts.friendsCounts.reduce(
    (acc, curr) => acc + curr.used,
    0
  );
  const totalBackstageCodes = counts.backstageCounts
    ? counts.backstageCounts.reduce((acc, curr) => acc + curr.total, 0)
    : 0;
  const totalUsedBackstageCodes = counts.backstageCounts
    ? counts.backstageCounts.reduce((acc, curr) => acc + curr.used, 0)
    : 0;

  const totalGuestCodes =
    counts.guestCounts && counts.guestCounts.length > 0
      ? counts.guestCounts[0].total
      : 0;
  const totalUsedGuestCodes =
    counts.guestCounts && counts.guestCounts.length > 0
      ? counts.guestCounts[0].used
      : 0;

  const totalTableCodes = counts.tableCounts
    ? counts.tableCounts.reduce((acc, curr) => acc + curr.total, 0)
    : 0;
  const totalUsedTableCodes = counts.tableCounts
    ? counts.tableCounts.reduce((acc, curr) => acc + curr.used, 0)
    : 0;

  const displayDate = currentEventDate.format("DD MMM YYYY");

  const totalGenerated =
    totalFriendsCodes + totalBackstageCodes + totalGuestCodes + totalTableCodes;

  const totalUsed =
    totalUsedFriendsCodes +
    totalUsedBackstageCodes +
    totalUsedGuestCodes +
    totalUsedTableCodes;
  console.log("COUNT", currentEventDate);
  return (
    <div className="statistic">
      <div className="login-back-arrow" onClick={onClose}>
        <img src="/image/back-icon.svg" alt="" />
      </div>
      <img className="logo-global" src="/image/logo.svg" alt="" />
      <h1 className="dashboard-header-title">Statistic</h1>
      <div className="statistic-container">
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

        {/* GuestCodes Section */}
        <div className="statistc-parent">
          <h2 className="statistic-parent-title">GuestCodes</h2>
          <div className="statistic-parent-group total">
            <p>Total</p>
            <p>{totalGuestCodes}</p>
            <p>{totalUsedGuestCodes}</p>
          </div>
        </div>

        {/* FriendsCodes Section */}
        <div className="statistic-parent">
          <h2>FriendsCodes</h2>
          {(user.isDeveloper || user.isStaff) &&
            counts.friendsCounts.map((count) => (
              <div key={count._id} className="statistic-parent-group">
                <p>{count.name}</p>
                <p>{count.total}</p>
                <p>{count.used}</p>
              </div>
            ))}
          {(user.isAdmin || user.isDeveloper) && (
            <div className="statistic-parent-group total">
              <p>Total</p>
              <p>{totalFriendsCodes}</p>
              <p>{totalUsedFriendsCodes}</p>
            </div>
          )}
        </div>

        {/* BackstageCodes Section */}
        <div className="statistc-parent">
          <h2 className="statistic-parent-title">BackstageCodes</h2>
          {(user.isAdmin || user.isDeveloper) &&
            counts.backstageCounts &&
            counts.backstageCounts.map((count) => (
              <div key={count._id} className="statistic-parent-group">
                <p>{count.name}</p>
                <p>{count.total}</p>
                <p>{count.used}</p>
              </div>
            ))}
          {(user.isAdmin || user.isDeveloper) && (
            <div className="statistic-parent-group total">
              <p>Total</p>
              <p>{totalBackstageCodes}</p>
              <p>{totalUsedBackstageCodes}</p>
            </div>
          )}
        </div>
      </div>

      {/* TableCodes Section */}
      <div className="statistic-parent">
        <h2 className="statistic-parent-title">TableCodes</h2>
        {(user.isAdmin || user.isDeveloper) &&
          counts.tableCounts &&
          counts.tableCounts.map((count) => (
            <div key={count._id} className="statistic-parent-group">
              <p>
                {count.table} - {count.host}
              </p>
              <p>{count.total}</p>
              <p>{count.used}</p>
            </div>
          ))}
        {(user.isAdmin || user.isDeveloper) && (
          <div className="statistic-parent-group total">
            <p>Total</p>
            <p>{totalTableCodes}</p>
            <p>{totalUsedTableCodes}</p>
          </div>
        )}
      </div>

      <div className="statistc-parent">
        <div className="statistic-parent-group total">
          <p>TOTAL</p>
          <p>{totalGenerated}</p>
          <p>{totalUsed}</p>
        </div>
      </div>
    </div>
  );
}

export default Statistic;
