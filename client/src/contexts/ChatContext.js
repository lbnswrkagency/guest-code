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
      console.log("[Chat:fetchChats] Fetching chats");
      const response = await axiosInstance.get("/chats");
      const fetchedChats = response.data;

      console.log("[Chat:fetchChats] Raw chats data:", {
        count: fetchedChats.length,
        chats: fetchedChats.map((c) => ({
          id: c._id,
          participantsCount: c.participants?.length,
          hasMessages: !!c.messages?.length,
        })),
      });

      // Filter out the current user from participants
      const processedChats = fetchedChats.map((chat) => {
        const filteredParticipants =
          chat.participants?.filter((p) => p._id !== user._id) || [];
        return {
          ...chat,
          participants: filteredParticipants,
        };
      });

      console.log("[Chat:fetchChats] Processed chats:", {
        count: processedChats.length,
        chats: processedChats.map((c) => ({
          id: c._id,
          participantsCount: c.participants?.length,
          firstParticipant: c.participants?.[0]?.username || "Unknown",
        })),
      });

      setChats(processedChats);

      // Calculate unread messages
      const unreadMessages = processedChats.reduce((acc, chat) => {
        return acc + (chat.unreadCount || 0);
      }, 0);

      console.log("[Chat:fetchChats] Updated unread count:", unreadMessages);
      setUnreadCount(unreadMessages);
    } catch (error) {
      console.error("[Chat:fetchChats] Error fetching chats:", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  // Create or get existing chat
  const createChat = async (userId) => {
    try {
      console.log("[Chat] Creating/getting chat with user:", userId);
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
      console.error("[Chat] Error creating chat:", error);
      throw error;
    }
  };

  const handleNewMessage = useCallback(
    (data) => {
      console.log("[Chat:handleNewMessage] Received new message data:", {
        data,
        activeChat: activeChat?._id,
      });

      if (!data || !data.chatId) {
        console.error("[Chat:handleNewMessage] Invalid message data received");
        return;
      }

      const { chatId, message } = data;

      if (!message) {
        console.error("[Chat:handleNewMessage] Message object is undefined");
        return;
      }

      setChats((prevChats) => {
        console.log(
          "[Chat:handleNewMessage] Updating chats with new message:",
          {
            chatId,
            messageId: message._id,
            prevChatsCount: prevChats.length,
          }
        );

        const chatIndex = prevChats.findIndex((c) => c._id === chatId);
        if (chatIndex === -1) {
          console.log(
            "[Chat:handleNewMessage] Chat not found in state:",
            chatId
          );
          return prevChats;
        }

        const updatedChats = [...prevChats];
        const chat = { ...updatedChats[chatIndex] };

        // Initialize messages array if it doesn't exist
        if (!chat.messages) {
          console.log(
            "[Chat:handleNewMessage] Initializing messages array for chat:",
            chatId
          );
          chat.messages = [];
        }

        // Add the new message
        chat.messages.push(message);
        chat.lastMessage = message;
        chat.updatedAt = message.createdAt || new Date().toISOString();

        // Update unread count if not the active chat
        if (activeChat?._id !== chatId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
          console.log("[Chat:handleNewMessage] Updated unread count:", {
            chatId,
            newCount: chat.unreadCount,
          });
        }

        updatedChats[chatIndex] = chat;

        // Sort chats by latest message
        const sortedChats = updatedChats.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB - dateA;
        });

        console.log("[Chat:handleNewMessage] Chats updated successfully:", {
          totalChats: sortedChats.length,
          updatedChatId: chatId,
        });

        return sortedChats;
      });

      // If this is the active chat, update it as well
      setActiveChat((prevActiveChat) => {
        if (prevActiveChat?._id === chatId) {
          console.log("[Chat:handleNewMessage] Updating active chat:", chatId);
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

    console.log("[Chat] Setting up socket listeners");

    // Clean up existing listeners before setting up new ones
    socket.off("new_message");
    socket.off("message_read");

    socket.on("new_message", (data) => {
      console.log("[Chat:socket] Received new message:", {
        chatId: data.chatId,
        messageId: data.message?._id,
        sender: data.message?.sender?.username,
      });

      // Don't process if it's our own message (we already handled it in sendMessage)
      if (data.message?.sender?._id === user._id) {
        console.log("[Chat:socket] Ignoring own message");
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
      console.log("[Chat] Cleaning up socket listeners");
      socket.off("new_message");
      socket.off("message_read");
    };
  }, [socket, user, handleNewMessage]);

  const sendMessage = async (content) => {
    if (!activeChat) {
      console.error("[ChatContext:sendMessage] No active chat");
      return;
    }

    console.log("[ChatContext:sendMessage] Sending message:", {
      chatId: activeChat._id,
      content,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await axiosInstance.post("/messages/send", {
        chatId: activeChat._id,
        content,
      });

      console.log("[ChatContext:sendMessage] Message sent successfully:", {
        messageId: response.data._id,
        chatId: response.data.chat,
        timestamp: response.data.createdAt,
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

      // No need to emit socket event - server will broadcast to all participants
      return response.data;
    } catch (error) {
      console.error("[ChatContext:sendMessage] Error sending message:", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
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
