import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiCheckLine,
  RiCloseFill,
  RiTeamLine,
  RiUserFollowLine,
  RiStarLine,
  RiNotificationLine,
  RiTimeLine,
} from "react-icons/ri";
import "./NotificationPanel.scss";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const NotificationPanel = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // console.log("[NotificationPanel] Fetching notifications...");
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get(
        `/notifications/user/${user._id}`
      );
      setNotifications(response.data);
      setLoading(false);
    } catch (error) {
      toast.showError("Failed to load notifications");
      setLoading(false);
    }
  };

  const handleProcessJoinRequest = async (requestId, action) => {
    try {
      await axiosInstance.post(`/brands/join-requests/${requestId}/process`, {
        action,
      });

      // Find the notification associated with this request
      const notification = notifications.find((n) => n.requestId === requestId);

      if (notification) {
        // Mark as read and update locally first
        await axiosInstance.put(`/notifications/${notification._id}/read`);

        // Delete the notification to prevent it from reappearing
        await axiosInstance.delete(`/notifications/${notification._id}`);

        // Update local state by removing the notification entirely
        setNotifications((prev) =>
          prev.filter((n) => n._id !== notification._id)
        );
      }

      toast.showSuccess(`Join request ${action}ed successfully`);
    } catch (error) {
      console.error(
        `[NotificationPanel] Error processing join request:`,
        error
      );
      toast.showError(`Failed to ${action} join request`);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // console.log("[NotificationPanel] Marking notification as read:", notificationId);
      await axiosInstance.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      // console.error("[NotificationPanel] Error marking notification as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "join_request":
        return <RiTeamLine />;
      case "join_request_accepted":
        return <RiCheckLine />;
      case "join_request_rejected":
        return <RiCloseFill />;
      case "new_follower":
        return <RiUserFollowLine />;
      case "new_favorite":
        return <RiStarLine />;
      default:
        return <RiNotificationLine />;
    }
  };

  const handleEntityClick = async (type, id, notification) => {
    // Mark notification as read when clicked
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // console.log("[NotificationPanel] handleEntityClick - Raw data:", {
    //   type,
    //   id,
    //   notification: {
    //     _id: notification?._id,
    //     type: notification?.type,
    //     metadata: notification?.metadata,
    //     brandId: notification?.brandId,
    //   },
    // });

    switch (type) {
      case "brand":
        // First try to get the brand data from metadata
        const brandData = notification?.metadata?.brand;
        // console.log("[NotificationPanel] Brand data from metadata:", brandData);

        // Try to get username in order of priority
        const brandUsername =
          brandData?.username || // from metadata.brand.username
          (typeof id === "object" ? id.username : null) || // if id is an object with username
          notification?.brand?.username || // from notification.brand
          id; // fallback to id if it's a string

        // console.log("[NotificationPanel] Resolved brand username:", {
        //   fromMetadata: brandData?.username,
        //   fromIdObject: typeof id === "object" ? id.username : null,
        //   fromNotification: notification?.brand?.username,
        //   fromId: id,
        //   final: brandUsername,
        // });

        if (!brandUsername) {
          // console.error(
          //   "[NotificationPanel] Could not resolve brand username:",
          //   {
          //     brandData,
          //     id,
          //     notification,
          //   }
          // );
          toast.showError("Could not navigate to brand profile");
          return;
        }

        // Log the final navigation attempt
        // console.log(
        //   "[NotificationPanel] Attempting navigation to:",
        //   `/@${user.username}/@${brandUsername}`
        // );
        navigate(`/@${user.username}/@${brandUsername}`);
        onClose();
        break;

      case "event":
        // For events, we need to fetch the event data first to get the title and brand
        try {
          const { data } = await axiosInstance.get(`/events/${id}`);

          if (data.success && data.event) {
            const event = data.event;

            // Format date for URL (MMDDYY)
            const eventDate = new Date(event.startDate);
            const month = String(eventDate.getMonth() + 1).padStart(2, "0");
            const day = String(eventDate.getDate()).padStart(2, "0");
            const year = String(eventDate.getFullYear()).slice(2);
            const dateSlug = `${month}${day}${year}`;

            // We're no longer using title slugs or /e/ in the URL
            // just use the date directly

            // Get the brand username from the brand object
            const brandUsername = event.brand.username || "";

            // Construct the URL with ultra-simplified format
            const eventPath = user
              ? `/@${user.username}/@${brandUsername}/${dateSlug}`
              : `/@${brandUsername}/${dateSlug}`;

            navigate(eventPath);
          } else {
            // Fallback to old URL format if event data not available
            navigate(`/events/${id}`);
          }
        } catch (error) {
          console.error(
            "[NotificationPanel] Error fetching event data:",
            error
          );
          // Fallback to old URL format if there's an error
          navigate(`/events/${id}`);
        }
        onClose();
        break;

      default:
        // console.log("[NotificationPanel] Unhandled entity type:", type);
        break;
    }
  };

  const formatEntityName = (entity, type, notification) => {
    if (!entity) {
      console.warn("[NotificationPanel] No entity provided for formatting", {
        type,
        notificationId: notification?._id,
      });
      return "";
    }

    // For brands, try to get the username from different possible locations
    let username;
    if (type === "brand") {
      // If entity is already a string (username), use it directly
      if (typeof entity === "string") {
        username = entity;
      } else {
        username = entity.username || entity.name;

        // If no username found in entity, try metadata
        if (!username && notification?.metadata?.brand) {
          username =
            notification.metadata.brand.username ||
            notification.metadata.brand.name;
        }
      }
    } else if (type === "user") {
      // For user entities, be more defensive
      if (typeof entity === "string") {
        username = entity;
      } else {
        username = entity.username || entity.name || "Unknown User";
      }
    } else {
      username = entity.username || entity.name || "Unknown";
    }

    if (!username) {
      console.warn("[NotificationPanel] No username found for entity:", {
        entity,
        type,
        notificationMetadata: notification?.metadata,
      });
      return type === "user" ? "Someone" : "Unknown";
    }

    return (
      <span
        className={`entity-name ${type} ${type !== "user" ? "clickable" : ""}`}
        onClick={() =>
          type !== "user" && handleEntityClick(type, entity, notification)
        }
      >
        @{username}
      </span>
    );
  };

  const renderNotificationContent = (notification) => {
    const { type, metadata, read, requestId } = notification;
    // console.log("Rendering notification:", { type, metadata });

    // Check if we should show an avatar (expand this for more notification types)
    const showAvatar =
      (type === "new_follower" && metadata?.follower) ||
      (type === "join_request" && metadata?.user) ||
      metadata?.user?.avatar;

    // Get the avatar URL based on notification type
    const getAvatarUrl = () => {
      if (type === "new_follower" && metadata?.follower?.avatar) {
        // Handle nested avatar object structure
        const avatar = metadata.follower.avatar;
        return avatar.medium || avatar.thumbnail || avatar;
      } else if (metadata?.user?.avatar) {
        // Handle nested avatar object structure
        const avatar = metadata.user.avatar;
        return avatar.medium || avatar.thumbnail || avatar;
      }
      return null;
    };

    // Get the first letter for placeholder avatar
    const getAvatarInitial = () => {
      if (type === "new_follower" && metadata?.follower?.username) {
        return metadata.follower.username.charAt(0).toUpperCase();
      } else if (metadata?.user?.username) {
        return metadata.user.username.charAt(0).toUpperCase();
      }
      return "U";
    };

    const renderMessage = () => {
      let messageContent;
      switch (type) {
        case "new_follower":
          if (!metadata?.follower || !metadata?.brand) {
            messageContent = "Someone started following your brand";
            break;
          }
          messageContent = (
            <>
              {formatEntityName(metadata.follower, "user", notification)}{" "}
              started following{" "}
              {formatEntityName(metadata.brand, "brand", notification)}
            </>
          );
          break;
        case "join_request":
          if (!metadata?.user || !metadata?.brand) {
            messageContent = "Someone requested to join a brand";
            break;
          }
          messageContent = (
            <>
              {formatEntityName(metadata.user, "user", notification)} wants to
              join {formatEntityName(metadata.brand, "brand", notification)}
            </>
          );
          break;
        case "join_request_accepted":
          if (!metadata?.brand) {
            messageContent = "Your join request has been accepted";
            break;
          }
          messageContent = (
            <>
              Your request to join{" "}
              {formatEntityName(metadata.brand, "brand", notification)} has been
              accepted
            </>
          );
          break;
        case "join_request_rejected":
          if (!metadata?.brand) {
            messageContent = "Your join request has been rejected";
            break;
          }
          messageContent = (
            <>
              Your request to join{" "}
              {formatEntityName(metadata.brand, "brand", notification)} has been
              rejected
            </>
          );
          break;
        case "new_favorite":
          messageContent = (
            <>
              {formatEntityName(metadata.user, "user", notification)} favorited{" "}
              {formatEntityName(metadata.brand, "brand", notification)}
            </>
          );
          break;
        case "event_invitation":
          messageContent = (
            <>
              You've been invited to{" "}
              {formatEntityName(metadata.event, "event", notification)} by{" "}
              {formatEntityName(metadata.inviter, "user", notification)}
            </>
          );
          break;
        case "test":
          messageContent = notification.message;
          break;
        default:
          if (metadata?.mentions) {
            messageContent = metadata.mentions.reduce((msg, mention) => {
              return msg.replace(
                `@${mention.username}`,
                formatEntityName(mention, mention.type, notification)
              );
            }, notification.message);
          } else {
            messageContent = notification.message;
          }
      }
      return messageContent;
    };

    return (
      <div className="content-container">
        {!showAvatar && (
          <div className="notification-icon">{getNotificationIcon(type)}</div>
        )}
        {showAvatar && (
          <div className="notification-avatar">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt="Avatar"
                className="profile-pic"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                  e.target.parentNode.classList.add("show-default");
                }}
              />
            ) : (
              <div className="default-avatar">{getAvatarInitial()}</div>
            )}
          </div>
        )}
        <div className="content-wrapper">
          <div className="content-main">
            <p className="message">{renderMessage()}</p>
            <span className="timestamp">
              <RiTimeLine />
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          {type === "join_request" &&
            !notification.read &&
            !notification.processed && (
              <div className="actions">
                <button
                  className="accept"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProcessJoinRequest(requestId, "accept");
                  }}
                >
                  <RiCheckLine />
                  Accept
                </button>
                <button
                  className="reject"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProcessJoinRequest(requestId, "reject");
                  }}
                >
                  <RiCloseLine />
                  Reject
                </button>
              </div>
            )}
          {(type === "join_request_accepted" ||
            type === "join_request_rejected") && (
            <div className="status-badge">
              {type === "join_request_accepted" ? (
                <span className="accepted">
                  <RiCheckLine /> Accepted
                </span>
              ) : (
                <span className="rejected">
                  <RiCloseLine /> Rejected
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const filteredNotifications = showHistory
    ? notifications
    : notifications.filter((n) => !n.read);

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <h2>Notifications</h2>
        <div className="header-actions">
          <motion.button
            className={`history-toggle ${showHistory ? "active" : ""}`}
            onClick={toggleHistory}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RiTimeLine />
          </motion.button>
          <motion.button
            className="close-btn"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RiCloseLine />
          </motion.button>
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            {showHistory ? "No notification history" : "No new notifications"}
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification._id}
                className={`notification-item ${
                  notification.read ? "read" : "unread"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                onClick={() =>
                  !notification.read && markAsRead(notification._id)
                }
              >
                {renderNotificationContent(notification)}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
