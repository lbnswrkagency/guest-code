import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, X } from "lucide-react";
import axios from "axios";
import io from "socket.io-client";
import "./GlobalChat.scss";

const GlobalChat = ({ onClose, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/messages/global`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to fetch messages. Please try again later.");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const newSocket = io(process.env.REACT_APP_API_BASE_URL, {
      query: { token },
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket");
    });

    newSocket.on("new_message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    newSocket.on("typing", ({ userId }) => {
      if (userId !== user._id) {
        setTypingUsers((prevUsers) => new Set(prevUsers).add(userId));
      }
    });

    newSocket.on("stop_typing", ({ userId }) => {
      if (userId !== user._id) {
        setTypingUsers((prevUsers) => {
          const newUsers = new Set(prevUsers);
          newUsers.delete(userId);
          return newUsers;
        });
      }
    });

    newSocket.on("user_status", ({ userId, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status === "online",
      }));
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(newSocket);

    fetchMessages();

    return () => {
      newSocket.off("new_message");
      newSocket.off("typing");
      newSocket.off("stop_typing");
      newSocket.off("user_status");
      newSocket.close();
    };
  }, [user._id, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = useCallback(
    (e) => {
      if (!socket) return;

      const value = e.target.value;
      setNewMessage(value);

      socket.emit("typing", { chatId: "global" });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { chatId: "global" });
      }, 2000);
    },
    [socket]
  );

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/messages`,
        { content: newMessage, chatId: "global" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
      if (socket) {
        socket.emit("stop_typing", { chatId: "global" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
                    <span
                      className={`user-status ${
                        onlineUsers[message.sender._id] ? "online" : "offline"
                      }`}
                    >
                      {onlineUsers[message.sender._id] ? "Online" : "Offline"}
                    </span>
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
