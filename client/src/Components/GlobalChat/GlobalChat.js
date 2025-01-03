// GlobalChat.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, X } from "lucide-react";
import axios from "axios";
import "./GlobalChat.scss";
import { getToken } from "../../utils/authUtils";
import { useSocket } from "../../contexts/SocketContext";

const GlobalChat = ({ onClose, user }) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const addMessage = useCallback((message) => {
    setMessages((prevMessages) => {
      const messageExists = prevMessages.some((msg) => msg._id === message._id);
      if (!messageExists) {
        return [...prevMessages, message];
      }
      return prevMessages;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("new_message", (message) => {
      console.log("[GlobalChat] New message received:", message);
      addMessage(message);
    });

    socket.on("user_typing", (userId) => {
      console.log("[GlobalChat] User typing:", userId);
      if (userId !== user._id) {
        setTypingUsers((prevUsers) => new Set(prevUsers).add(userId));
      }
    });

    socket.on("user_stop_typing", (userId) => {
      console.log("[GlobalChat] User stopped typing:", userId);
      setTypingUsers((prevUsers) => {
        const newUsers = new Set(prevUsers);
        newUsers.delete(userId);
        return newUsers;
      });
    });

    return () => {
      socket.off("new_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [socket, user._id, addMessage]);

  const fetchMessages = useCallback(async () => {
    try {
      console.log("[GlobalChat] Fetching messages");
      const token = await getToken();
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/messages/global`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(
        "[GlobalChat] Fetched messages count:",
        response.data.messages.length
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error("[GlobalChat] Error fetching messages:", error);
      setError("Failed to fetch messages. Please try again later.");
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = (e) => {
    // Set the new message value first
    setNewMessage(e.target.value);

    // Only emit typing events if socket exists
    if (!socket) return;

    // Emit typing event
    socket.emit("user_typing");

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout for stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit("user_stop_typing");
      }
    }, 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const token = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/messages`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Only emit if socket exists
      if (socket) {
        socket.emit("send_message", response.data);
      }

      // Add message locally
      addMessage(response.data);

      setNewMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }

      // Only emit stop typing if socket exists
      if (socket) {
        socket.emit("user_stop_typing");
      }
    } catch (error) {
      console.error("[GlobalChat] Error sending message:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <div className="global-chat-overlay">
      <div className="global-chat">
        <div className="chat-header">
          <h2>Global Chat</h2>
          <span
            className={`connection-status-indicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          />
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="chat-messages">
          {error && <div className="error-message">{error}</div>}
          {messages.map((message) => (
            <div
              key={message._id}
              className={`message ${
                message.sender._id === user._id ? "own-message" : ""
              }`}
            >
              <div className="message-content">
                <img
                  src={message.sender.avatar || "/default-avatar.png"}
                  alt={message.sender.username}
                  className="avatar"
                />
                <div className="message-bubble">
                  <div className="sender">
                    {message.sender.username}
                    {/* <span
                      className={`user-status ${
                        onlineUsers.has(message.sender._id)
                          ? "online"
                          : "offline"
                      }`}
                    >
                      {onlineUsers.has(message.sender._id)
                        ? "Online"
                        : "Offline"}
                    </span> */}
                  </div>
                  <div className="content">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              {Array.from(typingUsers).length === 1
                ? "Someone is typing..."
                : "Multiple people are typing..."}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="message-form">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="message-input"
            rows="1"
          />
          <button
            type="submit"
            className={`send-button ${isSending ? "sending" : ""}`}
            disabled={isSending}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GlobalChat;
