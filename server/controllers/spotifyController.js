const axios = require("axios");

const fetchAllTracks = async (url, accessToken, allTracks = []) => {
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const tracks = response.data.items;
    allTracks.push(...tracks);

    console.log(
      `Fetched ${tracks.length} tracks. Total so far: ${allTracks.length}`
    );

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

    console.log(
      "Initial fetch successful. Total tracks in first fetch: ",
      playlistResponse.data.items.length
    );

    // Fetch all tracks
    const allTracks = await fetchAllTracks(
      playlistResponse.data.href,
      accessToken
    );

    console.log("Total tracks fetched: ", allTracks.length);

    res.json({ items: allTracks });
  } catch (error) {
    console.error("Error in getSpotifyPlaylist:", error);
    res.status(500).json({ error: "Error fetching Spotify playlist" });
  }
};
