const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const session = require("express-session");
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
const brandRoutes = require("./routes/api/brandRoutes");
const locationRoutes = require("./routes/api/locationRoutes");
const notificationRoutes = require("./routes/api/notificationRoutes");

// Directory setup
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
dotenv.config();

console.log("[Server:Init] Environment check:", {
  hasAccessSecret: !!process.env.JWT_ACCESS_SECRET,
  hasRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
  accessSecretStart: process.env.JWT_ACCESS_SECRET?.substring(0, 10) + "...",
  refreshSecretStart: process.env.JWT_REFRESH_SECRET?.substring(0, 10) + "...",
});

const app = express();
const server = http.createServer(app);

// CORS setup
app.use((req, res, next) => {
  console.log("[Server:CORS] Request details:", {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    hasAuthHeader: !!req.headers.authorization,
    cookies: Object.keys(req.cookies || {}),
  });
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://guestcode.vercel.app",
        "https://www.guestcode.vercel.app",
        "https://afrospiti.com",
        "https://www.afrospiti.com",
        "https://guestcode-client.onrender.com",
      ];
      console.log("[Server:CORS] Origin check:", {
        requestOrigin: origin,
        isAllowed: allowedOrigins.includes(origin),
      });
      callback(null, allowedOrigins.includes(origin) ? origin : false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Cookie settings
const cookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// Middleware setup
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Make sure this comes after CORS
app.use(cookieParser());

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    name: "sessionId", // Change default cookie name for better security
  })
);

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

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("[Server] MongoDB connected successfully!"))
  .catch((error) =>
    console.log(`[Server] Error connecting to MongoDB:`, error)
  );

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to GUEST CODE backend!");
});

// Initialize Socket.IO
console.log("[Server] Initializing Socket.IO");
const io = setupSocket(server);
app.set("io", io);

// Start server
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`[Server] Server running on port ${port}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
  console.log(
    `[Server] MongoDB connected: ${mongoose.connection.readyState === 1}`
  );
  console.log(`[Server] Socket.IO initialized`);
  console.log(
    `[Server] CORS origin: ${process.env.CLIENT_URL || "http://localhost:3000"}`
  );
});

// Error handling
server.on("error", (error) => {
  console.error("[Server] Server error:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
});
