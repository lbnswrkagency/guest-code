import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Spotify.scss";

const Spotify = ({ brandUsername }) => {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        setError(null);

        // Determine the API endpoint based on whether a brandUsername is provided
        const endpoint = brandUsername
          ? `${process.env.REACT_APP_API_BASE_URL}/spotify/playlist/${brandUsername}`
          : `${process.env.REACT_APP_API_BASE_URL}/spotify/playlist`;

        const response = await axios.get(endpoint);

        if (response.data && response.data.items) {
          setPlaylist(response.data);
        } else {
          console.error("Invalid data structure:", response.data);
          setError("Invalid playlist data received");
        }
      } catch (error) {
        console.error("Error fetching Spotify playlist:", error);
        setError("Error loading Spotify playlist");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [brandUsername]);

  if (loading) {
    return <div className="spotify-loading">Loading playlist...</div>;
  }

  if (error || !playlist) {
    return (
      <div className="spotify-error">{error || "Error loading playlist"}</div>
    );
  }

  // Ensure 'playlist' has 'items' property and it's an array
  if (!Array.isArray(playlist.items)) {
    console.error("playlist.items is not an array:", playlist.items);
    return <div className="spotify-error">Error loading playlist</div>;
  }

  // Sort the tracks based on the 'added_at' field
  const sortedTracks = [...playlist.items].sort(
    (a, b) => new Date(b.added_at) - new Date(a.added_at)
  );

  // Get the latest 10 tracks
  const latestSongs = sortedTracks.slice(0, 10);

  // Get brand name for display - use the response info if available
  const displayName =
    playlist.brand?.name ||
    (brandUsername ? `@${brandUsername}` : "@AFROSPITI");

  return (
    <section className="spotify">
      <h1 className="spotify-header">{displayName}</h1>
      <img className="spotify-image" src="./image/spotify_b.svg" alt="" />

      <div className="spotify-playlist">
        <a
          href={playlist.external_urls ? playlist.external_urls.spotify : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="spotify-link"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_506_975)">
              <path
                d="M11 0.5C5.19219 0.5 0.5 5.20433 0.5 11C0.5 16.8078 5.20433 21.5 11 21.5C16.8078 21.5 21.5 16.7957 21.5 11C21.5 5.20433 16.7957 0.5 11 0.5ZM15.8169 15.6541C15.6289 15.9678 15.2272 16.0554 14.9135 15.8674C12.4421 14.362 9.34363 14.0233 5.68011 14.8512C5.32902 14.9267 4.97792 14.7134 4.90245 14.3623C4.82698 14.0112 5.04027 13.6601 5.39136 13.5846C9.39317 12.6692 12.83 13.0577 15.5901 14.7515C15.6645 14.7957 15.7293 14.8543 15.781 14.9238C15.8326 14.9932 15.87 15.0722 15.891 15.1561C15.9119 15.2401 15.9161 15.3274 15.9032 15.413C15.8903 15.4985 15.8607 15.5807 15.8159 15.6548L15.8169 15.6541ZM17.0966 12.7939C16.8583 13.1827 16.3563 13.2959 15.9678 13.0695C13.1453 11.3383 8.84225 10.8366 5.50555 11.84C5.06652 11.9653 4.61502 11.7271 4.48934 11.3006C4.364 10.8615 4.60222 10.41 5.04125 10.2844C8.85472 9.13034 13.5968 9.68225 16.8459 11.6769C17.2222 11.9027 17.3348 12.4044 17.0969 12.7935L17.0966 12.7939ZM17.2094 9.80792C13.8222 7.80078 8.23981 7.61277 5.00319 8.59123C4.48869 8.75431 3.93678 8.45342 3.7737 7.93892C3.61063 7.42442 3.91152 6.87252 4.42602 6.70944C8.13941 5.58069 14.3114 5.80611 18.2007 8.11447C18.665 8.39009 18.8153 8.99253 18.5393 9.4565C18.2883 9.93327 17.6737 10.0839 17.2094 9.80759V9.80792Z"
                fill="black"
              />
            </g>
            <defs>
              <clipPath id="clip0_506_975">
                <rect
                  width="21"
                  height="21"
                  fill="white"
                  transform="translate(0.5 0.5)"
                />
              </clipPath>
            </defs>
          </svg>
          <p>Listen on Spotify</p>
        </a>

        <div className="spotify-latest">
          <h3>Latest Updates</h3>
        </div>

        <div className="spotify-songs">
          {latestSongs.map((item, index) => (
            <div key={index} className="song">
              <a
                href={item.track.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={item.track.album.images[2].url}
                  alt={item.track.name}
                  className="song-cover"
                />
              </a>
              <div className="song-info">
                <p className="song-name">{item.track.name}</p>
                <p className="song-artist">
                  {item.track.artists.map((artist) => artist.name).join(", ")}
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
