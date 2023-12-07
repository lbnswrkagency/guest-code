const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");

const dotenv = require("dotenv");

const authRoutes = require("./routes/api/auth");
const spotifyRoutes = require("./routes/api/spotifyRoutes");

const userRoutes = require("./routes/api/users");

const app = express();

const eventsRoutes = require("./routes/api/events");
const dnsRoutes = require("./routes/api/dnsRoutes");
const friendsRoutes = require("./routes/api/friendsRoutes");
const qrRoutes = require("./routes/api/qrRoutes");

dotenv.config();

app.use(express.json({ limit: "200mb" }));

app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.use(cors());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://guestcode-client.onrender.com",
      "https://afrospiti.com",
      "http://192.168.1.10:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/events", eventsRoutes);

app.use("/api/spotify", spotifyRoutes);

app.use("/api/dns", dnsRoutes);

app.use("/api/friends", friendsRoutes);
app.use("/api/qr", qrRoutes);

const port = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => console.log(`Error connecting to MongoDB: ${error}`));

app.get("/", (req, res) => {
  res.send("Welcome to GUEST CODE backend!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
