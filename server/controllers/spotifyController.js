const axios = require("axios");

exports.getSpotifyPlaylist = async (req, res) => {
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

    // Fetch playlist
    const playlistResponse = await axios.get(
      "https://api.spotify.com/v1/playlists/7Iphu6m4LrPArmLAOHODIx",
      {
        // Replace {PLAYLIST_ID} with the actual playlist ID
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(playlistResponse.data);
  } catch (error) {
    console.error("Error fetching Spotify playlist:", error);
    res.status(500).json({ error: "Error fetching Spotify playlist" });
  }
};
