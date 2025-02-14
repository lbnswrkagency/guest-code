// GlobalChat.js
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiSendPlaneFill,
  RiEmotionLine,
  RiUserAddLine,
  RiTeamLine,
  RiCloseLine,
} from "react-icons/ri";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import ChatList from "../ChatList/ChatList";
import UserSearch from "../UserSearch/UserSearch";
import "./GlobalChat.scss";

const GlobalChat = () => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [globalChats, setGlobalChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const messageEndRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Fetch global chats
  useEffect(() => {
    const fetchGlobalChats = async () => {
      try {
        console.log("[GlobalChat] Fetching global chats");
        // In a real app, you would fetch this from your API
        const mockChats = [
          {
            _id: "global-1",
            name: "Event: Product Launch",
            participantCount: 45,
            messages: [],
            type: "global",
          },
          {
            _id: "global-2",
            name: "Event: Tech Conference",
            participantCount: 128,
            messages: [],
            type: "global",
          },
        ];
        setGlobalChats(mockChats);
      } catch (error) {
        console.error("[GlobalChat] Error fetching global chats:", error);
      }
    };

    fetchGlobalChats();
  }, []);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat) return;

    try {
      socket.emit("global_message", {
        chatId: activeChat._id,
        content: message,
        type: "text",
      });
      setMessage("");
    } catch (error) {
      console.error("[GlobalChat] Error sending message:", error);
    }
  };

  // Handle typing events
  const handleTyping = () => {
    if (!isTyping && activeChat) {
      setIsTyping(true);
      socket.emit("typing", { chatId: activeChat._id, chatType: "global" });

      setTimeout(() => {
        setIsTyping(false);
        socket.emit("stop_typing", {
          chatId: activeChat._id,
          chatType: "global",
        });
      }, 2000);
    }
  };

  // Handle user invitation
  const handleInviteUser = async (selectedUser) => {
    try {
      socket.emit("invite_to_global", {
        chatId: activeChat._id,
        userId: selectedUser._id,
      });
      setShowInvite(false);
    } catch (error) {
      console.error("[GlobalChat] Error inviting user:", error);
    }
  };

  return (
    <div className="global-chat">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Event Chats</h2>
        </div>

        <ChatList
          chats={globalChats}
          activeChat={activeChat}
          onChatSelect={setActiveChat}
          type="global"
        />
      </div>

      <div className="chat-main">
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="chat-info">
                <h3>{activeChat.name}</h3>
                <span className="participant-count">
                  {activeChat.participantCount} participants
                </span>
              </div>
              <div className="header-actions">
                <motion.button
                  className="action-btn"
                  onClick={() => setShowInvite(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiUserAddLine />
                </motion.button>
                <motion.button
                  className="action-btn"
                  onClick={() => setShowParticipants(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RiTeamLine />
                </motion.button>
              </div>
            </div>

            <div className="messages-container">
              {activeChat.messages?.map((msg) => (
                <motion.div
                  key={msg._id}
                  className={`message ${
                    msg.sender._id === user._id ? "sent" : "received"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {msg.sender._id !== user._id && (
                    <span className="sender-name">{msg.sender.username}</span>
                  )}
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </motion.div>
              ))}
              <div ref={messageEndRef} />
            </div>

            <div className="chat-input">
              <button className="emoji-btn">
                <RiEmotionLine />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Send a message to everyone..."
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <RiSendPlaneFill />
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <h3>Select an event chat to join the conversation</h3>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showParticipants && (
          <motion.div
            className="participants-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="overlay-content">
              <div className="overlay-header">
                <h3>Participants</h3>
                <button onClick={() => setShowParticipants(false)}>
                  <RiCloseLine />
                </button>
              </div>
              <div className="participants-list">
                {/* This would be populated with actual participants */}
                <div className="participant">
                  <div className="participant-avatar">J</div>
                  <span className="participant-name">John Doe</span>
                  <span className="participant-status online">Online</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showInvite && (
          <motion.div
            className="invite-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="overlay-content">
              <div className="overlay-header">
                <h3>Invite to Event Chat</h3>
                <button onClick={() => setShowInvite(false)}>
                  <RiCloseLine />
                </button>
              </div>
              <UserSearch
                onSelect={handleInviteUser}
                placeholder="Search users to invite..."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalChat;
