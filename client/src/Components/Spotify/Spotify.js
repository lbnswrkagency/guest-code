import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Spotify.scss";

const Spotify = () => {
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/spotify/playlist`
        );
        setPlaylist(response.data);
      } catch (error) {
        console.error("Error fetching Spotify playlist:", error);
      }
    };

    fetchPlaylist();
  }, []);

  if (!playlist) {
    return <div>Loading...</div>;
  }

  const latestSongs = [...playlist.tracks.items].reverse().slice(0, 10);
  return (
    <section className="spotify">
      <div className="spotify-header">
        <h1>{playlist.name}</h1>
        <p>{playlist.description}</p>
      </div>

      <div className="spotify-playlist">
        <img
          src={playlist.images[0].url}
          alt={`${playlist.name} cover`}
          className="playlist-cover"
        />
        <a
          href={playlist.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="spotify-link"
        >
          Listen on Spotify
        </a>

        <h2 className="spotify-latest">Latest Updates</h2>

        <div className="spotify-songs">
          {latestSongs.map((track, index) => (
            <div key={index} className="song">
              <img
                src={track.track.album.images[2].url}
                alt={track.track.name}
                className="song-cover"
              />
              <div className="song-info">
                <p className="song-name">{track.track.name}</p>
                <p className="song-artist">
                  {track.track.artists.map((artist) => artist.name).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Spotify;
