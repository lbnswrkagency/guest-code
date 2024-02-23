import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./TableCode.scss"; // Assume you have similar styling or adjust as needed
import { useNavigate } from "react-router-dom";

function TableCode({ user, onClose, refreshCounts }) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const navigate = useNavigate();

  const tableNumbers = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5"]; // Sample table numbers

  const handleTableCode = () => {
    if (name && pax && tableNumber) {
      toast.loading("Generating Table Code...");
      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/tables/add`, // Adjust your API endpoint as needed
          {
            name,
            pax,
            tableNumber,
            event: user.events,
            host: user.name,
          },
          { responseType: "blob" }
        )
        .then((response) => {
          toast.remove();
          toast.success("Table Code generated!");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setDownloadUrl(url);
          refreshCounts();
        })
        .catch((error) => {
          toast.error("Error generating Table Code.");
          console.error("Error generating Table Code:", error);
        });
    } else {
      toast.error("Please fill in all fields.");
    }
  };

  return (
    <div className="tablecode">
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <h1 className="tablecode-title">Reserve a Table for Your Friends!</h1>
      <div className="tablecode-form">
        <input
          className="tablecode-input"
          type="text"
          placeholder="Your Friend's Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="tablecode-select"
          value={pax}
          onChange={(e) => setPax(e.target.value)}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} Pax
            </option>
          ))}
        </select>
        <select
          className="tablecode-select"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        >
          {tableNumbers.map((number, index) => (
            <option key={index} value={number}>
              {number}
            </option>
          ))}
        </select>
        <button className="tablecode-button" onClick={handleTableCode}>
          Generate Table Code
        </button>
      </div>
      {downloadUrl && (
        <div className="tablecode-preview">
          <p>Download and send the Table Code to your friend:</p>
          <img src={downloadUrl} alt="Table Code Preview" />
          <a href={downloadUrl} download="table-code.png">
            Download
          </a>
        </div>
      )}
    </div>
  );
}

export default TableCode;
