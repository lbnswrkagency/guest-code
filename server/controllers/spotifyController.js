const axios = require("axios");
const Brand = require("../models/brandModel");

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
    console.error("Error in fetchAllTracks:", error);
    throw error; // Throw the error to be caught in the main function
  }
};

exports.getSpotifyPlaylist = async (req, res) => {
  try {
    const { brandUsername } = req.params;

    if (!brandUsername) {
      // Fallback to environment variables if no brand is specified (for backward compatibility)
      return getPlaylistFromEnvVars(req, res);
    }

    // Find the brand by username
    const brand = await Brand.findOne({ username: brandUsername });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    // Check if brand has Spotify configuration
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

    res.json({
      items: allTracks,
      name: playlistDetails.data.name,
      description: playlistDetails.data.description,
      external_urls: playlistDetails.data.external_urls,
      images: playlistDetails.data.images,
      brand: {
        name: brand.name,
        username: brand.username,
      },
    });
  } catch (error) {
    console.error("Error in getSpotifyPlaylist:", error);
    res.status(500).json({ error: "Error fetching Spotify playlist" });
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
    console.error("Error in getPlaylistFromEnvVars:", error);
    res.status(500).json({ error: "Error fetching Spotify playlist" });
  }
};
