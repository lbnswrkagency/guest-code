import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Inbox.scss";

const Inbox = () => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  return (
    <div className="inbox">
      <h2>Your Conversations</h2>
      <div className="chat-list">
        {chats.map((chat) => (
          <Link to={`/chat/${chat._id}`} key={chat._id} className="chat-item">
            <div className="chat-info">
              <span className="chat-name">
                {chat.type === "direct"
                  ? chat.participants.find(
                      (p) => p._id !== localStorage.getItem("userId")
                    ).username
                  : "Global Chat"}
              </span>
              {chat.lastMessage && (
                <span className="last-message">{chat.lastMessage.content}</span>
              )}
            </div>
            {chat.lastMessage && (
              <span className="timestamp">
                {new Date(chat.lastMessage.createdAt).toLocaleTimeString()}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Inbox;
