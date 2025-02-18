const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const { generateAccessToken } = require("./utils/auth");

const setupSocket = (server) => {
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

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        throw new Error("No token provided");
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.userId = decoded.userId;

        // Fetch user data
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
          return next(new Error("Authentication failed: User not found"));
        }

        // Attach user data to socket
        socket.user = user;
        next();
      } catch (verifyError) {
        if (verifyError.name === "TokenExpiredError") {
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

            // Fetch user data
            const user = await User.findById(decoded.userId).select(
              "-password"
            );
            if (!user) {
              return next(new Error("Authentication failed: User not found"));
            }

            // Attach user data to socket
            socket.user = user;
            next();
          } catch (refreshError) {
            next(new Error("Authentication failed: invalid refresh token"));
          }
        } else {
          next(new Error("Authentication failed: " + verifyError.message));
        }
      }
    } catch (error) {
      next(new Error("Authentication failed: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Store user in online users map
    onlineUsers.set(socket.user._id.toString(), socket.id);

    // Join user-specific room for notifications
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);
    socket.join("global");

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

    socket.emit("initial_online_users", onlineUsersData);

    // Message handling
    socket.on("send_message", (message) => {
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
      socket.broadcast.emit("user_typing", socket.user._id);
    });

    socket.on("user_stop_typing", () => {
      socket.broadcast.emit("user_stop_typing", socket.user._id);
    });

    // Disconnect handling
    socket.on("disconnect", () => {
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
