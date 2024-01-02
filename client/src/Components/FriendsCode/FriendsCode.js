import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./FriendsCode.scss";
import { useNavigate } from "react-router-dom";

import qrcode from "./img/qrcode.svg";
import logo from "./img/rund.svg";
import Preview from "./img/guestcode.png";

function FriendsCode({ user, onClose }) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [condition, setCondition] = useState("free");
  const navigate = useNavigate();

  const handleCheckbox = (event) => {
    setCondition(event.target.id);
  };

  const handleFriendsCode = () => {
    if (name && condition) {
      toast.loading("Generating Friends-Code...");
      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/friends/add`,
          {
            name: name,
            pax: 1,
            date: "19/11/2022",
            paxChecked: 0,
            condition: "FREE ENTRANCE UNTIL MIDNIGHT",
            event: user.events,
            host: user.name,
          },
          { responseType: "blob" }
        )
        .then((response) => {
          toast.remove();
          toast.success("Friends-Code generated!");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setDownloadUrl(url);
        });
    }

    if (name === "") {
      toast.error("Enter a Name.");
    }
  };

  return (
    <div className="friendscode">
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <img
        className="friendscode-logo"
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />
      <h1 className="friendscode-title">Invite your Friends!</h1>
      <p className="friendscode-description">
        with this Friends Code you get free entrance until midnight.
      </p>

      <div className="friendscode-admin">
        <h1>Friends-Code</h1>
        <p>FREE ENTRANCE UNTIL MIDNIGHT</p>

        <input
          className="friendscode-name"
          type="text"
          placeholder="Your Friends Name"
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={handleFriendsCode}>Generate Friends Code</button>
      </div>

      <div className="friendscode-preview">
        {downloadUrl ? (
          <>
            <p className="friendscode-preview-text">
              SAVE IMAGE & <br /> SEND YOUR FRIEND
            </p>
            <img className="friendscode-image" src={downloadUrl} alt="" />

            <div className="share-buttons">
              <a
                href={downloadUrl}
                className="friends-download"
                download="friends-code.png"
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

export default FriendsCode;
