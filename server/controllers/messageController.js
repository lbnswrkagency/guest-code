const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const mongoose = require("mongoose");

exports.getGlobalMessages = async (req, res) => {
  try {
    const globalChat = await Chat.findOne({ type: "global" });
    if (!globalChat) {
      return res.status(404).json({ message: "Global chat not found" });
    }

    const { cursor, limit = 50 } = req.query;
    const maxLimit = Math.min(parseInt(limit), 100);

    let query = { chat: globalChat._id };
    if (cursor) {
      query._id = { $lt: mongoose.Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .populate("sender", "username avatar");

    const hasMore = messages.length === maxLimit;
    const newCursor =
      messages.length > 0 ? messages[messages.length - 1]._id : null;

    res.status(200).json({
      messages: messages.reverse(),
      nextCursor: hasMore ? newCursor : null,
      hasMore,
    });
  } catch (error) {
    console.error("Error in getGlobalMessages:", error);
    res.status(500).json({
      message: "Error fetching global messages",
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, chatId } = req.body;
    const senderId = req.user._id;

    let chatIdToUse = chatId;
    if (chatId === "global") {
      const globalChat = await Chat.findOne({ type: "global" });
      if (!globalChat) {
        return res.status(400).json({ message: "Global chat not found" });
      }
      chatIdToUse = globalChat._id;
    }

    if (!mongoose.Types.ObjectId.isValid(chatIdToUse)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    const newMessage = new Message({
      content,
      sender: senderId,
      chat: chatIdToUse,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username avatar")
      .populate("chat", "type");

    if (chatId !== "global") {
      await Chat.findByIdAndUpdate(chatIdToUse, {
        lastMessage: newMessage._id,
      });
    }

    const io = req.app.get("io");
    io.to("global").emit("new_message", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res
      .status(500)
      .json({ message: "Error sending message", error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { cursor, limit = 50 } = req.query;
    const maxLimit = Math.min(parseInt(limit), 100);

    let query = { chat: chatId };
    if (cursor) {
      query._id = { $lt: mongoose.Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .populate("sender", "username avatar");

    const hasMore = messages.length === maxLimit;
    const newCursor =
      messages.length > 0 ? messages[messages.length - 1]._id : null;

    res.status(200).json({
      messages: messages.reverse(),
      nextCursor: hasMore ? newCursor : null,
      hasMore,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching messages", error: error.message });
  }
};
