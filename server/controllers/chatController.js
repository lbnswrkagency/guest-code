const Chat = require("../models/Chat");
const Message = require("../models/messageModel");

exports.createChat = async (req, res) => {
  try {
    const { type, participants } = req.body;

    // Check if chat already exists between these users
    const existingChat = await Chat.findOne({
      type: "private",
      participants: {
        $all: [req.user.userId, ...participants],
        $size: 2,
      },
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    // Create new chat if none exists
    const newChat = new Chat({
      type,
      participants: [req.user.userId, ...participants],
      messages: [],
      unreadCount: 0,
    });

    await newChat.save();

    // Populate the participants information
    const populatedChat = await Chat.findById(newChat._id)
      .populate("participants", "username firstName lastName avatar")
      .populate("lastMessage");

    console.log("[ChatController] Created new chat:", {
      chatId: populatedChat._id,
      participants: populatedChat.participants.map((p) => p._id),
    });

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error("[ChatController] Error creating chat:", error);
    res.status(500).json({
      message: "Error creating chat",
      error: error.message,
    });
  }
};

exports.getChats = async (req, res) => {
  try {
    console.log("[ChatController] Fetching chats for user:", req.user.userId);
    const chats = await Chat.find({
      participants: req.user.userId,
    })
      .populate("participants", "username firstName lastName avatar")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    console.log("[ChatController] Found chats:", {
      count: chats.length,
      chatIds: chats.map((chat) => chat._id),
    });

    res.status(200).json(chats);
  } catch (error) {
    console.error("[ChatController] Error in getChats:", error);
    res.status(500).json({
      message: "Error fetching chats",
      error: error.message,
    });
  }
};
