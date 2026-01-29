const axios = require("axios");
const Brand = require("../models/brandModel");

// Simple in-memory cache to prevent rate limiting
const playlistCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedPlaylist = (key) => {
  const cached = playlistCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedPlaylist = (key, data) => {
  playlistCache.set(key, { data, timestamp: Date.now() });
};

const fetchAllTracks = async (url, accessToken, allTracks = []) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const tracks = response.data.items;
    allTracks.push(...tracks);

    if (response.data.next) {
      return fetchAllTracks(response.data.next, accessToken, allTracks);
    }

    return allTracks;
  } catch (error) {
    throw error; // Throw the error to be caught in the main function
  }
};

exports.getSpotifyPlaylist = async (req, res) => {
  try {
    const { brandUsername } = req.params;

    if (!brandUsername) {
      return getPlaylistFromEnvVars(req, res);
    }

    // Check cache first
    const cacheKey = `playlist:${brandUsername}`;
    const cached = getCachedPlaylist(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const brand = await Brand.findOne({ username: brandUsername });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    if (
      !brand.spotifyClientId ||
      !brand.spotifyClientSecret ||
      !brand.spotifyPlaylistId
    ) {
      return res
        .status(400)
        .json({ error: "Brand has not configured Spotify integration" });
    }

    // Get access token
    const authResponse = await axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: "grant_type=client_credentials",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            brand.spotifyClientId + ":" + brand.spotifyClientSecret
          ).toString("base64"),
      },
    });

    const accessToken = authResponse.data.access_token;

    // Fetch initial playlist
    let playlistResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${brand.spotifyPlaylistId}/tracks`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Fetch all tracks
    const allTracks = await fetchAllTracks(
      playlistResponse.data.href,
      accessToken
    );

    // Get playlist details
    const playlistDetails = await axios.get(
      `https://api.spotify.com/v1/playlists/${brand.spotifyPlaylistId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const responseData = {
      items: allTracks,
      name: playlistDetails.data.name,
      description: playlistDetails.data.description,
      external_urls: playlistDetails.data.external_urls,
      images: playlistDetails.data.images,
      brand: {
        name: brand.name,
        username: brand.username,
      },
    };

    // Cache the successful response
    setCachedPlaylist(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'] || 30;
      return res.status(429).json({
        error: "Spotify rate limit exceeded",
        retryAfter: parseInt(retryAfter)
      });
    }

    res.status(500).json({ error: "Error fetching Spotify playlist", details: error.message });
  }
};

// Legacy method for backward compatibility
const getPlaylistFromEnvVars = async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    // Get access token
    const authResponse = await axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: "grant_type=client_credentials",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
    });

    const accessToken = authResponse.data.access_token;

    // Fetch initial playlist
    let playlistResponse = await axios.get(
      "https://api.spotify.com/v1/playlists/7Iphu6m4LrPArmLAOHODIx/tracks",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Fetch all tracks
    const allTracks = await fetchAllTracks(
      playlistResponse.data.href,
      accessToken
    );

    res.json({ items: allTracks });
  } catch (error) {
    res.status(500).json({ error: "Error fetching Spotify playlist" });
  }
};
