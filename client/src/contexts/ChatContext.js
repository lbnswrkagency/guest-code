import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import axiosInstance from "../utils/axiosConfig";

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch user's chats
  const fetchChats = async () => {
    try {
      const response = await axiosInstance.get("/chats");
      const fetchedChats = response.data;

      // Filter out the current user from participants
      const processedChats = fetchedChats.map((chat) => {
        const filteredParticipants =
          chat.participants?.filter((p) => p._id !== user._id) || [];
        return {
          ...chat,
          participants: filteredParticipants,
        };
      });

      setChats(processedChats);

      // Calculate unread messages
      const unreadMessages = processedChats.reduce((acc, chat) => {
        return acc + (chat.unreadCount || 0);
      }, 0);

      setUnreadCount(unreadMessages);
    } catch (error) {
      // Error handling without logging
    }
  };

  // Create or get existing chat
  const createChat = async (userId) => {
    try {
      const response = await axiosInstance.post("/chats", {
        type: "private",
        participants: [userId],
      });

      const newChat = {
        ...response.data,
        participants: response.data.participants.filter(
          (p) => p._id !== user._id
        ),
      };

      setChats((prev) => {
        const exists = prev.find((chat) => chat._id === newChat._id);
        if (exists) return prev;
        return [newChat, ...prev];
      });

      return newChat;
    } catch (error) {
      throw error;
    }
  };

  const handleNewMessage = useCallback(
    (data) => {
      if (!data || !data.chatId) {
        return;
      }

      const { chatId, message } = data;

      if (!message) {
        return;
      }

      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((c) => c._id === chatId);
        if (chatIndex === -1) {
          return prevChats;
        }

        const updatedChats = [...prevChats];
        const chat = { ...updatedChats[chatIndex] };

        // Initialize messages array if it doesn't exist
        if (!chat.messages) {
          chat.messages = [];
        }

        // Add the new message
        chat.messages.push(message);
        chat.lastMessage = message;
        chat.updatedAt = message.createdAt || new Date().toISOString();

        // Update unread count if not the active chat
        if (activeChat?._id !== chatId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        updatedChats[chatIndex] = chat;

        // Sort chats by latest message
        return updatedChats.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB - dateA;
        });
      });

      // If this is the active chat, update it as well
      setActiveChat((prevActiveChat) => {
        if (prevActiveChat?._id === chatId) {
          return {
            ...prevActiveChat,
            messages: [...(prevActiveChat.messages || []), message],
            lastMessage: message,
            updatedAt: message.createdAt || new Date().toISOString(),
          };
        }
        return prevActiveChat;
      });
    },
    [activeChat]
  );

  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return;

    // Clean up existing listeners before setting up new ones
    socket.off("new_message");
    socket.off("message_read");

    socket.on("new_message", (data) => {
      // Don't process if it's our own message (we already handled it in sendMessage)
      if (data.message?.sender?._id === user._id) {
        return;
      }

      handleNewMessage(data);
    });

    socket.on("message_read", ({ chatId, userId }) => {
      if (userId === user._id) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat._id === chatId) {
              return { ...chat, unreadCount: 0 };
            }
            return chat;
          })
        );
      }
    });

    return () => {
      socket.off("new_message");
      socket.off("message_read");
    };
  }, [socket, user, handleNewMessage]);

  const sendMessage = async (content) => {
    if (!activeChat) {
      return;
    }

    try {
      const response = await axiosInstance.post("/messages/send", {
        chatId: activeChat._id,
        content,
      });

      // Update local state immediately
      const updatedChat = {
        ...activeChat,
        messages: [...(activeChat.messages || []), response.data],
        lastMessage: response.data,
      };

      setActiveChat(updatedChat);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === activeChat._id ? updatedChat : chat
        )
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const value = {
    chats,
    activeChat,
    setActiveChat,
    unreadCount,
    createChat,
    fetchChats,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
