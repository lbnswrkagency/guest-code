import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import toast, { Toaster } from "react-hot-toast";
import "./TableCode.scss";
import { useNavigate } from "react-router-dom";

function TableCode({
  user,
  currentEventDate,
  onClose,
  refreshCounts,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
}) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableTables();
  }, [currentEventDate]);

  const fetchAvailableTables = () => {
    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/tables/available`, {
        params: { date: currentEventDate.format("YYYY-MM-DD") },
      })
      .then((response) => {
        setAvailableTables(response.data.tables);
      })
      .catch((error) => {
        console.error("Error fetching available tables:", error);
        toast.error("Error fetching available tables.");
      });
  };

  const handleTableCode = () => {
    if (name && pax && tableNumber) {
      toast.loading("Generating Table Code...");
      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/tables/add`,
          {
            name,
            pax,
            tableNumber,
            event: user.events,
            host: user.firstName,
            date: currentEventDate.format("YYYY-MM-DD"),
          },
          { responseType: "blob" }
        )
        .then((response) => {
          toast.remove();
          toast.success("Table Code generated!");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setDownloadUrl(url);
          refreshCounts();
          fetchAvailableTables();
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
      <h1>HI</h1>
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <div className="tablecode-navigation">
        <button onClick={onPrevWeek} disabled={isStartingEvent}>
          &#8592; Prev Week
        </button>
        <span>{currentEventDate.format("DD MMM YYYY")}</span>
        <button onClick={onNextWeek}>Next Week &#8594;</button>
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
          {availableTables.map((table, index) => (
            <option key={index} value={table.number}>
              {table.number} -{" "}
              {table.host ? `Reserved by ${table.host}` : "Available"}
            </option>
          ))}
        </select>
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
