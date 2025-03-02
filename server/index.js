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
const codesRoutes = require("./routes/api/codesRoutes");
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
      : [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:5001",
        ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["set-cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Apply CORS before any other middleware
app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options("*", cors(corsOptions));

// Global middleware to ensure CORS headers are always set
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }
  next();
});

// Then continue with other middleware
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
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
app.use("/api/codes", codesRoutes);
app.use("/api/code-settings", require("./routes/api/codeSettingsRoutes"));
app.use("/api/ticket-settings", require("./routes/api/ticketSettingsRoutes"));
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
    console.log("[MongoDB] Connection successful");
  })
  .catch((error) => {
    console.error("[MongoDB] Connection error:", error.message);
  });

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to GUEST CODE backend!");
});

// Initialize Socket.IO
const io = setupSocket(server);
app.set("io", io);

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`\n[Server] Running on port ${port}`);
  console.log(`[Server] Access via http://localhost:${port}`);
  console.log(`[Server] CORS enabled for origins:`, corsOptions.origin);
});

// Error handling
server.on("error", (error) => {
  console.error("[Server] Error:", error.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection:", reason);
});

app.post(
  `${process.env.NODE_ENV === "production" ? "/api/stripe" : ""}/webhook`,
  express.raw({ type: "application/json" }),
  (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Determine if it's a no-cost order
    const isNoCostOrder =
      event.type === "checkout.session.completed" &&
      event.data.object.amount_total === 0;

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const billingAddress = session.customer_details.address || null;
        fulfillOrder(session, billingAddress, isNoCostOrder); // Pass the isNoCostOrder flag to fulfillOrder
        break;
      default:
        console.log("Unhandled event type:", event.type);
    }

    response.json({ received: true }); // Acknowledge the event
  }
);
