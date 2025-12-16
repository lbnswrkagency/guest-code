import React from "react";
import { motion } from "framer-motion";
import { RiSendPlaneFill } from "react-icons/ri";
import { useAuth } from "../../contexts/AuthContext";
import "./ChatView.scss";

const ChatView = ({
  chat,
  message,
  setMessage,
  onSendMessage,
  messageEndRef,
}) => {
  const { user } = useAuth();

  const getParticipantName = () => {
    console.log("[ChatView:getParticipantName] Chat data:", {
      hasChat: !!chat,
      participantsCount: chat?.participants?.length,
      firstParticipant: chat?.participants?.[0],
    });

    if (!chat?.participants?.[0]) {
      console.warn("[ChatView:getParticipantName] No participant found");
      return "Unknown User";
    }

    const participant = chat.participants[0];

    // Try username first
    if (participant.username) {
      console.log(
        "[ChatView:getParticipantName] Using username:",
        participant.username
      );
      return participant.username;
    }

    // Then try full name
    const fullName = [participant.firstName, participant.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName) {
      console.log("[ChatView:getParticipantName] Using full name:", fullName);
      return fullName;
    }

    // Finally fall back to email or unknown
    const fallback = participant.email || "Unknown User";
    console.log("[ChatView:getParticipantName] Using fallback:", fallback);
    return fallback;
  };

  const getParticipantAvatar = () => {
    return chat?.participants?.[0]?.avatar || null;
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) {
      console.warn("[ChatView:formatMessageTime] No timestamp provided");
      return "";
    }

    try {
      const date = new Date(timestamp);
      if (date instanceof Date && !isNaN(date)) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        console.warn("[ChatView:formatMessageTime] Invalid date:", timestamp);
        return "";
      }
    } catch (error) {
      console.error("[ChatView:formatMessageTime] Error formatting time:", {
        timestamp,
        error: error.message,
      });
      return "";
    }
  };

  console.log("[ChatView:render] Rendering chat view:", {
    hasChat: !!chat,
    messageCount: chat?.messages?.length,
    participantName: getParticipantName(),
  });

  const isOwnMessage = (senderId) => {
    return senderId === user?._id;
  };

  return (
    <>
      <div className="chat-header">
        <div className="user-info">
          <div className="avatar">
            {getParticipantAvatar() ? (
              <img src={getParticipantAvatar()} alt={getParticipantName()} />
            ) : (
              <div className="avatar-placeholder">
                {getParticipantName().charAt(0)}
              </div>
            )}
          </div>
          <span className="username">{getParticipantName()}</span>
        </div>
      </div>

      <div className="messages-container">
        {chat.messages?.map((msg, index) => {
          const isSentByMe = isOwnMessage(msg.sender?._id || msg.sender);
          return (
            <motion.div
              key={msg._id || `temp-${index}`}
              className={`message ${isSentByMe ? "sent" : "received"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {!isSentByMe && (
                <div className="sender-info">
                  <span className="sender-name">
                    {msg.sender?.username || "Unknown"}
                  </span>
                </div>
              )}
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {formatMessageTime(msg.createdAt)}
              </div>
            </motion.div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..."
          onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
        />
        <button
          className="send-btn"
          onClick={onSendMessage}
          disabled={!message.trim()}
        >
          <RiSendPlaneFill />
        </button>
      </div>
    </>
  );
};

export default ChatView;
