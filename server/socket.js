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

  io.use(async (socket, next) => {
    console.log("[Socket:Auth] New connection attempt");

    if (!socket.handshake.query?.token) {
      return next(new Error("No token provided"));
    }

    try {
      const token = socket.handshake.query.token;
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded._id);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        socket.auth = false;
        return next(new Error("Token expired"));
      }
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log("[Socket] New connection established:", socket.user._id);

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
      console.log("[Socket] User disconnected:", socket.user._id);
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
