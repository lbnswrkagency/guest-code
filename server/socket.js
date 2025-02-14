const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const { debugLog } = require("./utils/logger");
const { generateAccessToken } = require("./utils/auth");

const setupSocket = (server) => {
  debugLog("Init", "Initializing Socket.IO server");
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  debugLog("Config", "Socket.IO configuration", {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  const onlineUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      debugLog("Socket:Auth", "Starting socket authentication");
      const token = socket.handshake.auth.token;

      if (!token) {
        throw new Error("No token provided");
      }

      debugLog("Socket:Auth", "Verifying token", { tokenLength: token.length });

      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.userId = decoded.userId;
        debugLog("Socket:Auth", "Token verified successfully", {
          userId: decoded.userId,
        });

        // Fetch user data
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
          debugLog("Auth", "User not found after token verification", {
            userId: decoded.userId,
          });
          return next(new Error("Authentication failed: User not found"));
        }

        debugLog("Auth", "User found and authenticated", {
          userId: user._id,
          username: user.username,
        });

        // Attach user data to socket
        socket.user = user;
        next();
      } catch (verifyError) {
        if (verifyError.name === "TokenExpiredError") {
          debugLog("Socket:Auth", "Token expired, attempting refresh");

          // Get refresh token from handshake
          const refreshToken = socket.handshake.auth.refreshToken;
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          try {
            // Verify refresh token
            const decoded = jwt.verify(
              refreshToken,
              process.env.JWT_REFRESH_SECRET
            );

            // Generate new access token
            const newAccessToken = generateAccessToken(decoded.userId);

            // Attach the new token to the socket for the client to retrieve
            socket.newAccessToken = newAccessToken;
            socket.userId = decoded.userId;

            debugLog("Socket:Auth", "Successfully refreshed token", {
              userId: decoded.userId,
              newTokenLength: newAccessToken.length,
            });

            // Fetch user data
            const user = await User.findById(decoded.userId).select(
              "-password"
            );
            if (!user) {
              debugLog("Auth", "User not found after token verification", {
                userId: decoded.userId,
              });
              return next(new Error("Authentication failed: User not found"));
            }

            debugLog("Auth", "User found and authenticated", {
              userId: user._id,
              username: user.username,
            });

            // Attach user data to socket
            socket.user = user;
            next();
          } catch (refreshError) {
            debugLog("Socket:Auth", "Refresh token verification failed", {
              error: refreshError.message,
            });
            next(new Error("Authentication failed: invalid refresh token"));
          }
        } else {
          debugLog("Socket:Auth", "Token verification failed", {
            error: verifyError.message,
          });
          next(new Error("Authentication failed: " + verifyError.message));
        }
      }
    } catch (error) {
      debugLog("Socket:Auth", "Authentication error", { error: error.message });
      next(new Error("Authentication failed: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    debugLog("Connection", "New socket connection", {
      socketId: socket.id,
      userId: userId,
      username: socket.user.username,
    });

    // Store user in online users map
    onlineUsers.set(socket.user._id.toString(), socket.id);
    debugLog("Users", "Updated online users list", {
      totalOnline: onlineUsers.size,
      onlineUsers: Array.from(onlineUsers.keys()),
    });

    // Join user-specific room for notifications
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);
    debugLog("Rooms", "User joined personal room", {
      userId: socket.user._id,
      room: userRoom,
    });

    socket.join("global");
    debugLog("Rooms", "User joined global room", {
      userId: socket.user._id,
      room: "global",
    });

    // Broadcast user status
    io.emit("user_status", {
      userId: socket.user._id,
      status: "online",
      userData: {
        _id: socket.user._id,
        username: socket.user.username,
        avatar: socket.user.avatar,
      },
    });

    // Send current online users to new client
    const onlineUsersData = Array.from(onlineUsers.entries()).map(
      ([id, socketId]) => {
        const userSocket = io.sockets.sockets.get(socketId);
        return {
          userId: id,
          userData: userSocket?.user
            ? {
                _id: userSocket.user._id,
                username: userSocket.user.username,
                avatar: userSocket.user.avatar,
              }
            : null,
        };
      }
    );

    debugLog("Users", "Sending initial online users to new client", {
      recipientId: socket.user._id,
      onlineCount: onlineUsersData.length,
    });

    socket.emit("initial_online_users", onlineUsersData);

    // Message handling
    socket.on("send_message", (message) => {
      debugLog("Message", "Broadcasting new message", {
        senderId: socket.user._id,
        messageType: message.type,
        timestamp: new Date().toISOString(),
      });

      io.emit("new_message", {
        ...message,
        sender: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      });
    });

    // Typing events
    socket.on("user_typing", () => {
      debugLog("Typing", "User started typing", {
        userId: socket.user._id,
        username: socket.user.username,
      });
      socket.broadcast.emit("user_typing", socket.user._id);
    });

    socket.on("user_stop_typing", () => {
      debugLog("Typing", "User stopped typing", {
        userId: socket.user._id,
        username: socket.user.username,
      });
      socket.broadcast.emit("user_stop_typing", socket.user._id);
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      debugLog("Disconnect", "User disconnected", {
        userId: socket.user._id,
        username: socket.user.username,
        reason: socket.disconnectReason,
      });

      onlineUsers.delete(socket.user._id.toString());

      debugLog("Users", "Updated online users after disconnect", {
        totalOnline: onlineUsers.size,
        onlineUsers: Array.from(onlineUsers.keys()),
      });

      io.emit("user_status", {
        userId: socket.user._id,
        status: "offline",
      });
    });

    // Error handling
    socket.on("error", (error) => {
      debugLog("Error", "Socket error occurred", {
        userId: socket.user._id,
        error: error.message,
        stack: error.stack,
      });
    });
  });

  return io;
};

module.exports = setupSocket;
