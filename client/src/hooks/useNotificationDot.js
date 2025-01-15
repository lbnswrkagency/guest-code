import { useState, useEffect } from "react";
import { useNotifications } from "../contexts/NotificationContext";

export const useNotificationDot = (type) => {
  const [hasNotification, setHasNotification] = useState(false);
  const { notifications } = useNotifications();

  useEffect(() => {
    if (type) {
      // Check for unread notifications of specific type
      const hasUnread = notifications.some((n) => !n.read && n.type === type);
      setHasNotification(hasUnread);
    } else {
      // Check for any unread notifications
      const hasUnread = notifications.some((n) => !n.read);
      setHasNotification(hasUnread);
    }
  }, [notifications, type]);

  return hasNotification;
};
