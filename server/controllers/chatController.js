const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

exports.createChat = async (req, res) => {
  try {
    const { type, participants } = req.body;
    const newChat = new Chat({
      type,
      participants: type === "direct" ? [...participants, req.user.id] : [],
    });
    await newChat.save();
    res.status(201).json(newChat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating chat", error: error.message });
  }
};

exports.getChats = async (req, res) => {
  try {
    console.log("Fetching chats for user:", req.user.id);
    const chats = await Chat.find({ participants: req.user.id })
      .populate("participants", "username")
      .populate("lastMessage");
    console.log("Chats found:", chats);
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error in getChats:", error);
    res
      .status(500)
      .json({ message: "Error fetching chats", error: error.message });
  }
};
