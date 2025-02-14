import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiSendPlaneFill, RiEditLine, RiArrowLeftLine } from "react-icons/ri";
import { useChat } from "../../contexts/ChatContext";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import UserSearch from "../UserSearch/UserSearch";
import ChatView from "../ChatView/ChatView";
import "./PersonalChat.scss";

const PersonalChat = () => {
  const [message, setMessage] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messageEndRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const { activeChat, chats, createChat, setActiveChat, sendMessage } =
    useChat();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat) return;

    try {
      console.log("[PersonalChat:handleSendMessage] Sending message:", {
        chatId: activeChat._id,
        content: message.trim(),
      });

      // Use the sendMessage function from ChatContext to save to DB
      await sendMessage(message.trim());

      // Clear the input after successful send
      setMessage("");

      // Scroll to bottom after sending
      scrollToBottom();
    } catch (error) {
      console.error("[PersonalChat] Error sending message:", error);
    }
  };

  // Handle user selection from search
  const handleUserSelect = async (selectedUser) => {
    try {
      const chat = await createChat(selectedUser._id);
      setActiveChat(chat);
      setShowUserSearch(false);
    } catch (error) {
      console.error("[PersonalChat] Error creating chat:", error);
    }
  };

  const getParticipantName = (chat) => {
    if (!chat?.participants?.[0]) return "Unknown User";
    const participant = chat.participants[0];
    return (
      participant.username ||
      `${participant.firstName} ${participant.lastName}`.trim() ||
      "Unknown User"
    );
  };

  const getParticipantAvatar = (chat) => {
    return chat?.participants?.[0]?.avatar || null;
  };

  return (
    <div className="personal-chat">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button
            className="new-chat-btn"
            onClick={() => setShowUserSearch(true)}
          >
            <RiEditLine />
          </button>
        </div>

        <div className="chat-list">
          {chats.map((chat) => (
            <motion.div
              key={chat._id}
              className={`chat-item ${
                activeChat?._id === chat._id ? "active" : ""
              }`}
              onClick={() => setActiveChat(chat)}
              whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="chat-avatar">
                {getParticipantAvatar(chat) ? (
                  <img
                    src={getParticipantAvatar(chat)}
                    alt={getParticipantName(chat)}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {getParticipantName(chat).charAt(0)}
                  </div>
                )}
                {chat.isOnline && <div className="online-indicator" />}
              </div>
              <div className="chat-info">
                <span className="username">{getParticipantName(chat)}</span>
                <span className="last-message">
                  {chat.lastMessage?.content || "No messages yet"}
                </span>
              </div>
              {chat.unreadCount > 0 && (
                <div className="unread-count">{chat.unreadCount}</div>
              )}
            </motion.div>
          ))}

          {chats.length === 0 && (
            <div className="no-chats">
              <p>No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="chat-main">
        {activeChat ? (
          <ChatView
            chat={activeChat}
            message={message}
            setMessage={setMessage}
            onSendMessage={handleSendMessage}
            messageEndRef={messageEndRef}
          />
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state">
              <RiEditLine className="edit-icon" />
              <h3>Your Messages</h3>
              <p>Send private messages to a friend</p>
              <button onClick={() => setShowUserSearch(true)}>
                Send Message
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUserSearch && (
          <motion.div
            className="user-search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="search-header">
              <button onClick={() => setShowUserSearch(false)}>
                <RiArrowLeftLine />
              </button>
              <h3>New Message</h3>
            </div>
            <UserSearch
              onSelect={handleUserSelect}
              placeholder="Search for a user..."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalChat;
