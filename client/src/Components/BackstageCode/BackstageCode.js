import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./BackstageCode.scss";
import { useNavigate } from "react-router-dom";

import qrcode from "./img/qrcode.svg";
import logo from "./img/rund.svg";
import Preview from "./img/guestcode.png";

function BackstageCode({ user, onClose }) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [condition, setCondition] = useState("free");
  const navigate = useNavigate();

  const handleCheckbox = (event) => {
    setCondition(event.target.id);
  };

  const handleBackstageCode = () => {
    if (name && condition) {
      toast.loading("Generating Backstage-Code...");
      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/backstage/add`,
          {
            name: name,
            pax: 1,
            date: "19/11/2022",
            paxChecked: 0,
            condition: "BACKSTAGE ACCESS ALL NIGHT",
            event: user.events,
            host: user.name,
          },
          { responseType: "blob" }
        )
        .then((response) => {
          toast.remove();
          toast.success("Backstage-Code generated!");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setDownloadUrl(url);
        });
    }

    if (name === "") {
      toast.error("Enter a Name.");
    }
  };

  return (
    <div className="backstagecode">
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <img
        className="backstagecode-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />
      <h1 className="backstagecode-title">Invite your Friends Backstage!</h1>
      <p className="backstagecode-description">
        with this Backstage Code you get free entrance all night and Backstage
        access
      </p>

      <div className="backstagecode-admin">
        <h1>Backstage-Code</h1>
        <p>FREE ENTRANCE ALL NIGHT</p>
        <p>BACKSTAGE ACCESS</p>

        <input
          className="backstagecode-name"
          type="text"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={handleBackstageCode}>Generate Backstage Code</button>
      </div>

      <div className="backstagecode-preview">
        {downloadUrl ? (
          <>
            <p className="backstagecode-preview-text">
              SAVE IMAGE & <br /> SEND YOUR FRIEND
            </p>
            <img className="backstagecode-image" src={downloadUrl} alt="" />

            <div className="share-buttons">
              <a
                href={downloadUrl}
                className="backstage-download"
                download="backstage-code.png"
              >
                DOWNLOAD
              </a>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default BackstageCode;
