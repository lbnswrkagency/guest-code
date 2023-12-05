const express = require("express");
const { getSpotifyPlaylist } = require("../../controllers/spotifyController");
const router = express.Router();

router.get("/playlist", getSpotifyPlaylist);

module.exports = router;
