import React, { useState, useEffect } from "react";
import "./Dropbox.scss";
import axios from "axios";

const Dropbox = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/dropbox/folder`
        );
        if (response.data) {
          setFiles(response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response && error.response.status === 403) {
          window.location = `${process.env.REACT_APP_API_BASE_URL}/dropbox/authorize`; // Redirect to authorize if not authenticated
        }
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dropbox">
      <h1>Promotion Materials</h1>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.name} -{" "}
            <a
              href={`https://www.dropbox.com/home${file.path_lower}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dropbox;
