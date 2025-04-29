const express = require("express");
const { getSpotifyPlaylist } = require("../../controllers/spotifyController");
const router = express.Router();

// Legacy route for backward compatibility
router.get("/playlist", getSpotifyPlaylist);

// New route for brand-specific playlists
router.get("/playlist/:brandUsername", getSpotifyPlaylist);

module.exports = router;
