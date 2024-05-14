import React, { useState } from "react";
import "./Statistic.scss";
import moment from "moment";
import Navigation from "../Navigation/Navigation";

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

  const totalInvitationCodes =
    counts.invitationCounts && counts.invitationCounts.length > 0
      ? counts.invitationCounts[0].total
      : 0;
  const totalUsedInvitationCodes =
    counts.invitationCounts && counts.invitationCounts.length > 0
      ? counts.invitationCounts[0].used
      : 0;

  const [detailsVisible, setDetailsVisible] = useState(false);

  const displayDate = currentEventDate.format("DD MMM YYYY");

  const totalGenerated =
    totalFriendsCodes +
    totalBackstageCodes +
    totalGuestCodes +
    totalTableCodes +
    totalInvitationCodes;

  const totalUsed =
    totalUsedFriendsCodes +
    totalUsedBackstageCodes +
    totalUsedGuestCodes +
    totalUsedTableCodes +
    totalUsedInvitationCodes;

  const toggleDetailsVisibility = () => {
    if (user.isAdmin) {
      setDetailsVisible(!detailsVisible);
    }
  };

  return (
    <div className="statistic">
      <Navigation />

      <h1 className="statistic-title">Statistic</h1>

      <div className="statistic-container">
        <div className="statistic-navigation">
          <button
            className="statistic-navigation-button"
            onClick={onPrevWeek}
            disabled={isStartingEvent}
            style={{ opacity: isStartingEvent ? 0 : 1 }}
          >
            <img
              src="/image/arrow-left.svg"
              alt=""
              className="statistic-navigation-arrow-left"
            />
          </button>
          <p className="statistic-navigation-date">{displayDate}</p>
          <button className="statistic-navigation-button" onClick={onNextWeek}>
            {" "}
            <img
              src="/image/arrow-right.svg"
              alt=""
              className="statistic-navigation-arrow-right"
            />
          </button>
        </div>

        <img className="statistic-logo" src="/image/logo.svg" alt="" />

        {/* GuestCodes Section */}
        <div className="statistic-code">
          <h2 className="statistic-code-title">Guest Codes</h2>

          <div
            className="statistic-code-container"
            onClick={toggleDetailsVisibility}
          >
            <div className="statistic-code-container-header">
              <div className="statistic-code-container-header-title">
                <img src="/image/generate.svg" alt="" />
                <h2>Generate</h2>
              </div>

              <div className="statistic-code-container-header-title">
                <img src="/image/checked.svg" alt="" />
                <h2>Check-In</h2>
              </div>
            </div>

            {detailsVisible && (
              <div className="statistic-code-details">
                <div className="statistic-code-details-more">
                  {(user.isDeveloper || user.isStaff) &&
                    counts.guestCounts.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{count.name}</p>
                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>

                        <p className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </p>
                      </div>
                    ))}
                </div>

                <div className="statistic-code-details-footer">
                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Total</h2>
                  </div>

                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Total</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="statistic-code-container-footer">
              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/generate.svg" alt="" />
                <p>{totalGuestCodes}</p>
              </div>

              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/checked.svg" alt="" />
                <p className="checked">{totalUsedGuestCodes}</p>
              </div>
            </div>
            <img
              src="/image/arrow-up.svg"
              alt=""
              className={`statistic-code-details-arrow ${
                !detailsVisible ? "rotated" : ""
              }`}
              onClick={toggleDetailsVisibility}
            />
          </div>
        </div>
        {/* InvitationCodes Section */}
        <div className="statistic-code">
          <h2 className="statistic-code-title">Invitation Codes [BETA]</h2>

          <div
            className="statistic-code-container"
            onClick={toggleDetailsVisibility}
          >
            <div className="statistic-code-container-header">
              <div className="statistic-code-container-header-title">
                <img src="/image/generate.svg" alt="" />
                <h2>Generate</h2>
              </div>

              <div className="statistic-code-container-header-title">
                <img src="/image/checked.svg" alt="" />
                <h2>Check-In</h2>
              </div>
            </div>

            {detailsVisible && (
              <div className="statistic-code-details">
                <div className="statistic-code-details-more">
                  {(user.isAdmin || user.isDeveloper) &&
                    counts.invitationCounts.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{count.name}</p>
                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>

                        <p className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </p>
                      </div>
                    ))}
                </div>

                <div className="statistic-code-details-footer">
                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Total</h2>
                  </div>

                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Total</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="statistic-code-container-footer">
              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/generate.svg" alt="" />
                <p>{totalInvitationCodes}</p>
              </div>

              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/checked.svg" alt="" />
                <p className="checked">{totalUsedInvitationCodes}</p>
              </div>
            </div>
            <img
              src="/image/arrow-up.svg"
              alt=""
              className={`statistic-code-details-arrow ${
                !detailsVisible ? "rotated" : ""
              }`}
              onClick={toggleDetailsVisibility}
            />
          </div>
        </div>

        {/* FriendsCodes Section */}

        <div className="statistic-code">
          <h2 className="statistic-code-title">Friends Codes</h2>

          <div
            className="statistic-code-container"
            onClick={toggleDetailsVisibility}
          >
            <div className="statistic-code-container-header">
              <div className="statistic-code-container-header-title">
                <img src="/image/generate.svg" alt="" />
                <h2>Generate</h2>
              </div>

              <div className="statistic-code-container-header-title">
                <img src="/image/checked.svg" alt="" />
                <h2>Check-In</h2>
              </div>
            </div>

            {detailsVisible && (
              <div className="statistic-code-details ">
                <div className="statistic-code-details-more">
                  {(user.isDeveloper || user.isStaff) &&
                    counts.friendsCounts.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{count.name}</p>

                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>

                        <p className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </p>
                      </div>
                    ))}
                </div>

                <div className="statistic-code-details-footer">
                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Total</h2>
                  </div>

                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Total</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="statistic-code-container-footer">
              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/generate.svg" alt="" />
                <p>{totalFriendsCodes} </p>
              </div>

              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/checked.svg" alt="" />
                <p className="checked">{totalUsedFriendsCodes}</p>
              </div>
            </div>
            <img
              src="/image/arrow-up.svg"
              alt=""
              className={`statistic-code-details-arrow ${
                !detailsVisible ? "rotated" : ""
              }`}
              onClick={toggleDetailsVisibility}
            />
          </div>
        </div>

        {/* BackstageCodes Section */}
        <div className="statistic-code">
          <h2 className="statistic-code-title">Backstage Codes</h2>

          <div
            className="statistic-code-container"
            onClick={toggleDetailsVisibility}
          >
            <div className="statistic-code-container-header">
              <div className="statistic-code-container-header-title">
                <img src="/image/generate.svg" alt="" />
                <h2>Generate</h2>
              </div>

              <div className="statistic-code-container-header-title">
                <img src="/image/checked.svg" alt="" />
                <h2>Check-In</h2>
              </div>
            </div>

            {detailsVisible && (
              <div className="statistic-code-details">
                <div className="statistic-code-details-more">
                  {(user.isAdmin || user.isDeveloper) &&
                    counts.backstageCounts.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{count.name}</p>
                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>

                        <p className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </p>
                      </div>
                    ))}
                </div>

                <div className="statistic-code-details-footer">
                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Total</h2>
                  </div>

                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Total</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="statistic-code-container-footer">
              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/generate.svg" alt="" />
                <p>{totalBackstageCodes}</p>
              </div>

              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/checked.svg" alt="" />
                <p className="checked">{totalUsedBackstageCodes}</p>
              </div>
            </div>
            <img
              src="/image/arrow-up.svg"
              alt=""
              className={`statistic-code-details-arrow ${
                !detailsVisible ? "rotated" : ""
              }`}
              onClick={toggleDetailsVisibility}
            />
          </div>
        </div>

        {/* TableCodes Section */}
        <div className="statistic-code">
          <h2 className="statistic-code-title">Table Codes</h2>

          <div
            className="statistic-code-container"
            onClick={toggleDetailsVisibility}
          >
            <div className="statistic-code-container-header">
              <div className="statistic-code-container-header-title">
                <img src="/image/generate.svg" alt="" />
                <h2>Generate</h2>
              </div>

              <div className="statistic-code-container-header-title">
                <img src="/image/checked.svg" alt="" />
                <h2>Check-In</h2>
              </div>
            </div>

            {detailsVisible && (
              <div className="statistic-code-details">
                <div className="statistic-code-details-more">
                  {(user.isAdmin || user.isDeveloper) &&
                    counts.tableCounts.map((count) => (
                      <div
                        key={count._id}
                        className="statistic-code-details-more-wrapper"
                      >
                        <div className="statistic-code-details-more-wrapper-generated">
                          <p className="name">{`${count.table} - ${count.name}`}</p>
                          <div>
                            <img src="/image/generate.svg" alt="" />
                            <p className="generated">{count.total}</p>
                          </div>
                        </div>

                        <p className="statistic-code-details-more-wrapper-checked">
                          <img src="/image/checked.svg" alt="" />
                          <p className="checked">{count.used}</p>
                        </p>
                      </div>
                    ))}
                </div>

                <div className="statistic-code-details-footer">
                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/generate.svg" alt="" />
                    <h2>Total</h2>
                  </div>

                  <div className="statistic-code-details-footer-wrapper">
                    <img src="/image/checked.svg" alt="" />
                    <h2>Total</h2>
                  </div>
                </div>
              </div>
            )}

            <div className="statistic-code-container-footer">
              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/generate.svg" alt="" />
                <p>{totalTableCodes}</p>
              </div>

              <div className="statistic-code-container-footer-wrapper">
                <img src="/image/checked.svg" alt="" />
                <p className="checked">{totalUsedTableCodes}</p>
              </div>
            </div>
            <img
              src="/image/arrow-up.svg"
              alt=""
              className={`statistic-code-details-arrow ${
                !detailsVisible ? "rotated" : ""
              }`}
              onClick={toggleDetailsVisibility}
            />
          </div>
        </div>

        <div className="statistc-parent">
          <div className="statistic-parent-group total">
            <p>TOTAL</p>
            <p>{totalGenerated}</p>
            <p>{totalUsed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistic;
