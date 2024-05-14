import React, { useState, useEffect } from "react";
import axios from "axios";
import "./LineUp.scss";

function LineUp({ eventId }) {
  const [lineUps, setLineUps] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [currentArtist, setCurrentArtist] = useState(null); // Holds the data for editing

  useEffect(() => {
    fetchLineUps();
  }, [eventId]);

  const fetchLineUps = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/lineup/event/${eventId}`
      );
      setLineUps(response.data);
    } catch (error) {
      console.error("Error fetching lineup", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/lineup/${id}`);
      fetchLineUps(); // Refresh list after deletion
    } catch (error) {
      console.error("Error deleting artist", error);
    }
  };

  const handleEdit = (artist) => {
    setCurrentArtist(artist); // Load the current artist into the form
    setShowCreator(true);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    // Append formData with the artist details (file, name, title, role)
    formData.append("name", currentArtist.name);
    formData.append("title", currentArtist.title);
    formData.append("role", currentArtist.role);

    try {
      const url = currentArtist._id
        ? `${process.env.REACT_APP_API_BASE_URL}/lineup/${currentArtist._id}`
        : `${process.env.REACT_APP_API_BASE_URL}/lineup/`;
      const method = currentArtist._id ? "put" : "post";

      const response = await axios({
        method: method,
        url: url,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLineUps([...lineUps, response.data]); // Update the list with the new or edited artist
      setShowCreator(false);
      setCurrentArtist(null); // Reset the form
    } catch (error) {
      console.error("Error submitting artist", error);
    }
  };

  const toggleCreator = () => {
    setShowCreator(!showCreator);
    if (showCreator) setCurrentArtist(null); // Clear form when closing
  };

  return (
    <div className="lineUp">
      <div className="lineUp-container">
        {lineUps.map((artist) => (
          <div className="lineUp-container-single" key={artist._id}>
            <img
              src={artist.avatar || "/image/sample.png"}
              alt={artist.name}
              className="lineUp-container-single-image"
            />
            <p className="lineUp-container-single-name">{artist.name}</p>
            <p className="lineUp-container-single-title">{artist.title}</p>
            <p className="lineUp-container-single-role">{artist.role}</p>
            <div className="lineUp-container-single-wrapper">
              <img
                src="/image/edit-icon.svg"
                alt="Edit"
                className="lineUp-container-single-wrapper-edit"
                onClick={() => handleEdit(artist)}
              />
              <img
                src="/image/delete-icon.svg"
                alt="Delete"
                className="lineUp-container-single-wrapper-delete"
                onClick={() => handleDelete(artist._id)}
              />
            </div>
          </div>
        ))}
      </div>

      {showCreator && (
        <div className="lineUp-creator">
          <input
            type="file"
            className="lineUp-creator-file"
            onChange={(e) =>
              setCurrentArtist({ ...currentArtist, avatar: e.target.files[0] })
            }
          />
          <input
            type="text"
            className="lineup-creator-name"
            placeholder="Name"
            value={currentArtist?.name || ""}
            onChange={(e) =>
              setCurrentArtist({ ...currentArtist, name: e.target.value })
            }
          />
          <input
            type="text"
            className="lineup-creator-title"
            placeholder="Title"
            value={currentArtist?.title || ""}
            onChange={(e) =>
              setCurrentArtist({ ...currentArtist, title: e.target.value })
            }
          />
          <input
            type="text"
            className="lineup-creator-role"
            placeholder="Role"
            value={currentArtist?.role || ""}
            onChange={(e) =>
              setCurrentArtist({ ...currentArtist, role: e.target.value })
            }
          />
          <div className="lineup-creator-wrapper">
            <img
              src="/image/check-icon.svg"
              alt="Submit"
              className="lineUp-creator-wrapper-check"
              onClick={handleSubmit}
            />
          </div>
        </div>
      )}

      <div className="lineUp-create" onClick={toggleCreator}>
        <img
          src="/image/create-icon.svg"
          alt=""
          className={`lineUp-create-icon ${showCreator ? "rotated" : ""}`}
          style={{ transform: showCreator ? "rotate(45deg)" : "none" }}
        />
        <p className="lineUp-create-title">
          {showCreator ? "Close Create Artist" : "Create Artist"}
        </p>
      </div>
    </div>
  );
}

export default LineUp;
