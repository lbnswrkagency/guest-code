import React from "react";
import { motion } from "framer-motion";
import "./ChatList.scss";

const ChatList = ({
  chats,
  activeChat,
  onChatSelect,
  type = "personal", // 'personal' or 'global'
}) => {
  const renderAvatar = (participant) => {
    if (!participant) return null;

    if (participant.avatar) {
      return (
        <img
          src={participant.avatar}
          alt={participant.username}
          className="avatar-image"
        />
      );
    }

    return (
      <div className="avatar-placeholder">
        {participant.username?.charAt(0).toUpperCase()}
      </div>
    );
  };

  const renderChatInfo = (chat) => {
    if (type === "personal") {
      const participant = chat.participants[0];
      return (
        <>
          <span className="chat-name">{participant?.username}</span>
          <span className="last-message">
            {chat.lastMessage?.content || "No messages yet"}
          </span>
        </>
      );
    }

    return (
      <>
        <span className="chat-name">{chat.name || "Event Chat"}</span>
        <span className="last-message">
          {chat.lastMessage
            ? `${chat.lastMessage.sender.username}: ${chat.lastMessage.content}`
            : "No messages yet"}
        </span>
      </>
    );
  };

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <motion.div
          key={chat._id}
          className={`chat-item ${
            activeChat?._id === chat._id ? "active" : ""
          } ${type}`}
          onClick={() => onChatSelect(chat)}
          whileHover={{ backgroundColor: "rgba(255, 200, 7, 0.1)" }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="chat-avatar">
            {type === "personal"
              ? renderAvatar(chat.participants[0])
              : renderAvatar(chat)}
            {chat.isOnline && <div className="online-indicator" />}
          </div>

          <div className="chat-info">{renderChatInfo(chat)}</div>

          {chat.unreadCount > 0 && (
            <div className="unread-count">{chat.unreadCount}</div>
          )}

          {type === "global" && (
            <div className="participant-count">
              {chat.participantCount || 0} online
            </div>
          )}
        </motion.div>
      ))}

      {chats.length === 0 && (
        <div className="no-chats">
          {type === "personal"
            ? "No conversations yet. Start a new chat!"
            : "No active event chats"}
        </div>
      )}
    </div>
  );
};

export default ChatList;
