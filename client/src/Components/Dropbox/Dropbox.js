import React, { useState, useEffect } from "react";
import "./Dropbox.scss";
import axios from "axios";

const Dropbox = () => {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/dropbox/folder`
        );
        if (Array.isArray(response.data)) {
          setFiles(response.data);
        } else {
          throw new Error("Received non-array response");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setFiles([]); // Ensure 'files' is always an array
      }
    };

    fetchData();
  }, []);

  const handleDownload = async (path) => {
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/dropbox/download/${encodeURIComponent(path)}`
      );
      window.location.href = response.data.link; // Directly download the file
    } catch (error) {
      console.error("Error getting download link:", error);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("uploadedFile", file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/dropbox/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("File uploaded successfully:", response.data);
      // Optionally reset file input
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  console.log("FILES", files);

  return (
    <div className="dropbox">
      <h1>Promotion Materials</h1>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <img src={file.thumbnailLink} alt={file.name} />
            <div>{file.name}</div>
            <button onClick={() => handleDownload(file.path_lower)}>
              Download
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload File</button>
      </form>
    </div>
  );
};

export default Dropbox;
