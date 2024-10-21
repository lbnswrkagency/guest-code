// TableSystem.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import TableLayout from "../TableLayout/TableLayout";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import CodeGenerator from "../CodeGenerator/CodeGenerator";
import "./TableSystem.scss";

function TableSystem({
  user,
  onClose,
  currentEventDate,
  onPrevWeek,
  onNextWeek,
  isStartingEvent,
  counts,
  refreshCounts,
}) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState("1");
  const [tableNumber, setTableNumber] = useState("");
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [codes, setCodes] = useState([]);

  // Function to handle code generation
  const handleGenerateCode = async () => {
    if (!name || !pax || !tableNumber) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Determine if the selected table is a Backstage table
    const isBackstageTable = [
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
    ].includes(tableNumber);

    const data = {
      name,
      event: user.events,
      host: user.firstName || user.userName,
      condition: "TABLE RESERVATION",
      hostId: user._id,
      pax,
      paxChecked: 0,
      tableNumber,
      backstagePass: isBackstageTable,
    };

    toast.loading(`Generating Table Code...`);

    try {
      // Create the code
      const createResponse = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/add`,
        data
      );

      const createdCode = createResponse.data;
      const codeId = createdCode._id;

      // Request the image
      const imageResponse = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/code/table/code/${codeId}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([imageResponse.data]));
      setDownloadUrl(url);
      refreshCounts();
      toast.success(`Table Code generated!`);
      setTableNumber(""); // Reset table number selection
      setName("");
      setPax("1");

      toast.dismiss();
    } catch (error) {
      toast.error("Error generating code.");
      console.error("Code generation error:", error);
    }
  };

  const displayDate = currentEventDate.format("DD MMM YYYY");

  return (
    <div className="table-system">
      <Toaster />
      <Navigation onBack={onClose} />
      <h1 className="table-system-title">Table Booking</h1>

      <div className="statistic-navigation code-nav">
        <button
          className="statistic-navigation-button"
          onClick={onPrevWeek}
          disabled={isStartingEvent}
          style={{ opacity: isStartingEvent ? 0 : 1 }}
        >
          <img
            src="/image/arrow-left.svg"
            alt=""
            className="statistic-navigation-arrow-left"
          />
        </button>
        <p className="statistic-navigation-date">{displayDate}</p>
        <button className="statistic-navigation-button" onClick={onNextWeek}>
          <img
            src="/image/arrow-right.svg"
            alt=""
            className="statistic-navigation-arrow-right"
          />
        </button>
      </div>

      <div className="table-system-content">
        <div className="table-system-form">
          <input
            className="code-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="code-select"
            value={pax}
            onChange={(e) => setPax(e.target.value)}
          >
            {[...Array(10).keys()].map((n) => (
              <option key={n + 1} value={n + 1}>
                {n + 1} People
              </option>
            ))}
          </select>
          <button className="code-btn" onClick={handleGenerateCode}>
            Generate Code
          </button>
        </div>
        <TableLayout
          counts={counts}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
        />
      </div>

      <Footer />
    </div>
  );
}

export default TableSystem;
