const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const setupSocket = (server) => {
  console.log("[Socket] Initializing Socket.IO server");
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Authentication failed"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log("[Socket] User connected:", userId);

    onlineUsers.set(socket.user._id.toString(), socket.id);
    console.log(
      "[Socket] Current online users:",
      Array.from(onlineUsers.keys())
    );

    socket.join("global");

    // Broadcast to ALL clients that this user is online
    io.emit("user_status", {
      userId: socket.user._id,
      status: "online",
      userData: {
        _id: socket.user._id,
        username: socket.user.username,
        avatar: socket.user.avatar,
      },
    });

    // Send current online users to the new client
    socket.emit(
      "initial_online_users",
      Array.from(onlineUsers.entries()).map(([id, socketId]) => ({
        userId: id,
        userData: io.sockets.sockets.get(socketId)?.user
          ? {
              _id: io.sockets.sockets.get(socketId).user._id,
              username: io.sockets.sockets.get(socketId).user.username,
              avatar: io.sockets.sockets.get(socketId).user.avatar,
            }
          : null,
      }))
    );

    socket.on("send_message", (message) => {
      console.log("[Socket] Broadcasting message from:", socket.user._id);
      io.emit("new_message", {
        ...message,
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on("user_typing", () => {
      console.log("[Socket] User typing:", socket.user._id);
      socket.broadcast.emit("user_typing", socket.user._id);
    });

    socket.on("user_stop_typing", () => {
      console.log("[Socket] User stopped typing:", socket.user._id);
      socket.broadcast.emit("user_stop_typing", socket.user._id);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] User disconnected:", userId);
      onlineUsers.delete(socket.user._id.toString());
      io.emit("user_status", {
        userId: socket.user._id,
        status: "offline",
      });
    });
  });

  return io;
};

module.exports = setupSocket;
