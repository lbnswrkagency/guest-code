const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const moment = require("moment-timezone");
const http = require("http");
const path = require("path");
const fs = require("fs");

// Import setupSocket
const setupSocket = require("./socket");

// Route imports
const authRoutes = require("./routes/auth");
const spotifyRoutes = require("./routes/api/spotifyRoutes");
const userRoutes = require("./routes/api/users");
const eventsRoutes = require("./routes/api/eventsRoutes");
const dnsRoutes = require("./routes/api/dnsRoutes");
const friendsRoutes = require("./routes/api/friendsRoutes");
const tableRoutes = require("./routes/api/tableRoutes");
const backstageRoutes = require("./routes/api/backstageRoutes");
const codeRoutes = require("./routes/api/codeRoutes");
const qrRoutes = require("./routes/api/qrRoutes");
const contactRoutes = require("./routes/api/contactRoutes");
const avatarRoutes = require("./routes/api/avatarRoutes");
const lineupRoutes = require("./routes/api/lineupRoutes");
const battleSignRoutes = require("./routes/api/battleSignRoutes");
const dropboxRoutes = require("./routes/api/dropboxRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const brandRoutes = require("./routes/brandRoutes");
const locationRoutes = require("./routes/api/locationRoutes");
const notificationRoutes = require("./routes/notificationRoute");
const uploadRoutes = require("./routes/api/uploadRoutes");
const searchRoutes = require("./routes/searchRoute");
const roleRoutes = require("./routes/roleRoutes");

// Directory setup
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CLIENT_BASE_URL
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Add headers for better caching and performance
app.use((req, res, next) => {
  // Set CORS headers for images and other static assets
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    res.set({
      "Access-Control-Allow-Origin": "*", // Allow images to be accessed from anywhere
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Max-Age": "86400", // 24 hours
      "Cache-Control": "public, max-age=31536000", // 1 year
      Vary: "Origin",
    });
  }
  next();
});

// Middleware setup
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Make sure this comes after CORS
app.use(cookieParser());

// Route setup
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/dns", dnsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/table", tableRoutes);
app.use("/api/backstage", backstageRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/lineup", lineupRoutes);
app.use("/api/battleSign", battleSignRoutes);
app.use("/api/dropbox", dropboxRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", searchRoutes);
app.use("/api/roles", roleRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    // Silent success
  })
  .catch((error) => {
    // Silent error
  });

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to GUEST CODE backend!");
});

// Initialize Socket.IO
const io = setupSocket(server);
app.set("io", io);

// Start server
const port = process.env.PORT || 5001;
server.listen(port);

// Error handling
server.on("error", (error) => {
  // Silent error
});

process.on("unhandledRejection", (reason, promise) => {
  // Silent error
});
