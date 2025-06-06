import React, { useState } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./FriendsCode.scss";
import { useNavigate } from "react-router-dom";

import qrcode from "./img/qrcode.svg";
import logo from "./img/rund.svg";
import Preview from "./img/guestcode.png";

function FriendsCode({ user, onClose, weeklyFriendsCount, refreshCounts }) {
  const [name, setName] = useState("");
  const [pax, setPax] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [condition, setCondition] = useState("free");
  const navigate = useNavigate();
  const toast = useToast();

  const handleCheckbox = (event) => {
    setCondition(event.target.id);
  };

  const handleFriendsCode = () => {
    if (name && condition) {
      const loadingToastId = toast.showLoading("Generating Friends-Code...");
      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/friends/add`,
          {
            name: name,
            pax: 1,
            date: "19/11/2022",
            paxChecked: 0,
            condition: "FREE ENTRANCE ALL NIGHT",
            event: user.events,
            host: user.firstName,
          },
          { responseType: "blob" }
        )
        .then((response) => {
          toast.removeToast(loadingToastId);
          toast.showSuccess("Friends-Code generated!");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setDownloadUrl(url);
          refreshCounts();
        });
    }

    if (name === "") {
      toast.showError("Enter a Name.");
    }
  };

  return (
    <div className="friendscode">
      <div className="login-back-arrow" onClick={onClose}>
        ← Back
      </div>
      <img className="friendscode-logo" src="public/limage/logo.svg" alt="" />
      <h1 className="friendscode-title">Invite your Friends!</h1>
      <p className="friendscode-description">
        with this Friends Code you get free entrance ALL NIGHT.
      </p>

      <div className="friendscode-count">
        <h4>THIS WEEKS COUNT</h4>
        <div className="friendscode-count-number">
          <p>{weeklyFriendsCount}</p>
        </div>
      </div>

      <div className="friendscode-admin">
        <h1>Friends-Code</h1>
        <p>FREE ENTRANCE ALL NIGHT</p>

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
