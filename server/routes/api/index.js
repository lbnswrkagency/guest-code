const express = require("express");
const router = express.Router();

// Import routes
const userRoutes = require("./userRoutes");
const brandRoutes = require("./brandRoutes");
const eventRoutes = require("./eventRoutes");
const codesRoutes = require("./codesRoutes");
const codeSettingsRoutes = require("./codeSettingsRoutes");
const dropboxRoutes = require("./dropboxRoutes");
const eventCodeRoutes = require("./eventCodeRoutes");

// Register routes
router.use("/users", userRoutes);
router.use("/brands", brandRoutes);
router.use("/events", eventRoutes);
router.use("/codes", codesRoutes);
router.use("/code-settings", codeSettingsRoutes);
router.use("/dropbox", dropboxRoutes);
router.use("/event-codes", eventCodeRoutes);

module.exports = router;
