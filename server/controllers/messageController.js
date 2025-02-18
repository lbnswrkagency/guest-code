const Message = require("../models/messageModel");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");

exports.getGlobalMessages = async (req, res) => {
  try {
    console.log("[MessageController] Fetching global messages");
    const globalChat = await Chat.findOne({ type: "global" });
    if (!globalChat) {
      console.log("[MessageController] Global chat not found");
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

    console.log("[MessageController] Fetched messages count:", messages.length);

    const hasMore = messages.length === maxLimit;
    const newCursor =
      messages.length > 0 ? messages[messages.length - 1]._id : null;

    res.status(200).json({
      messages: messages.reverse(),
      nextCursor: hasMore ? newCursor : null,
      hasMore,
    });
  } catch (error) {
    console.error("[MessageController] Error in getGlobalMessages:", error);
    res.status(500).json({
      message: "Error fetching global messages",
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    console.log("[MessageController:send] Starting message send", {
      body: req.body,
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
    });

    const { chatId, content } = req.body;
    const senderId = req.user.userId;

    if (!chatId || !content) {
      console.error("[MessageController:send] Missing required fields:", {
        chatId,
        content,
      });
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the chat and validate user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("[MessageController:send] Chat not found:", chatId);
      return res.status(404).json({ message: "Chat not found" });
    }

    console.log("[MessageController:send] Found chat:", {
      chatId: chat._id,
      participants: chat.participants,
      messageCount: chat.messages?.length || 0,
    });

    if (!chat.participants.includes(senderId)) {
      console.log("[MessageController:send] User not authorized:", {
        userId: senderId,
        chatId,
        participants: chat.participants,
      });
      return res.status(403).json({
        message: "Not authorized to send message in this chat",
      });
    }

    const newMessage = new Message({
      content,
      sender: senderId,
      chat: chatId,
      type: "text",
      createdAt: new Date(),
    });

    console.log("[MessageController:send] Created new message:", {
      messageId: newMessage._id,
      content: newMessage.content,
      sender: newMessage.sender,
      timestamp: newMessage.createdAt,
    });

    await newMessage.save();
    console.log("[MessageController:send] Message saved to database");

    // Update the chat with new message
    const chatUpdate = await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: { lastMessage: newMessage._id },
        $push: { messages: newMessage._id },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );

    console.log("[MessageController:send] Chat updated:", {
      chatId,
      messageCount: chatUpdate.messages.length,
      lastMessage: chatUpdate.lastMessage,
    });

    // Populate the message with sender details
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username avatar")
      .populate("chat", "type participants");

    console.log("[MessageController:send] Message populated:", {
      messageId: populatedMessage._id,
      sender: populatedMessage.sender.username,
      chatId: populatedMessage.chat._id,
    });

    // Send response
    res.status(201).json(populatedMessage);

    // Broadcast to participants
    const io = req.app.get("io");
    if (io) {
      chat.participants.forEach((participantId) => {
        console.log(
          "[MessageController:send] Broadcasting to participant:",
          participantId
        );
        io.to(`user:${participantId}`).emit("new_message", {
          chatId,
          message: populatedMessage,
        });
      });
    }
  } catch (error) {
    console.error("[MessageController:send] Error:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error sending message",
      error: error.message,
    });
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
