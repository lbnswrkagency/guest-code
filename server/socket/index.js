const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.token) {
      jwt.verify(
        socket.handshake.query.token,
        process.env.JWT_SECRET,
        (err, decoded) => {
          if (err) return next(new Error("Authentication error"));
          socket.decoded = decoded;
          next();
        }
      );
    } else {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.join("global");

    socket.on("typing", (data) => {
      socket.to("global").emit("typing", { userId: socket.decoded.id });
    });

    socket.on("stop_typing", () => {
      socket.to("global").emit("stop_typing", { userId: socket.decoded.id });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = setupSocket;
