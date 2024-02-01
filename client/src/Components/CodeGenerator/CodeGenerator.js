import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./CodeGenerator.scss";
import CodeManagement from "../CodeManagement/CodeManagement";

function CodeGenerator({ user, onClose, type, weeklyCount, refreshCounts }) {
  const [name, setName] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const [limit, setLimit] = useState(undefined);
  const [remainingCount, setRemainingCount] = useState(undefined);
  const [updateTrigger, setUpdateTrigger] = useState(false);

  const triggerUpdate = () => {
    setUpdateTrigger((prev) => !prev);
  };

  useEffect(() => {
    const newLimit =
      type === "Backstage"
        ? user.backstageCodeLimit
        : type === "Friends"
        ? user.friendsCodeLimit
        : undefined;

    setLimit(newLimit);
    if (newLimit !== undefined && newLimit > 0) {
      setRemainingCount(newLimit - weeklyCount);
    } else {
      setRemainingCount(weeklyCount);
    }
  }, [user, type, weeklyCount]);

  const title =
    type === "friends"
      ? "Invite your Friends!"
      : "Invite your Friends Backstage!";
  const description =
    type === "friends"
      ? "free entrance all night."
      : "free entrance all night & backstage pass.";

  const apiUrl = type === "friends" ? "/friends/add" : "/backstage/add";
  const conditionText =
    type === "friends"
      ? "FREE ENTRANCE ALL NIGHT"
      : "BACKSTAGE ACCESS ALL NIGHT";

  const handleCode = async () => {
    if (limit !== undefined && limit > 0 && remainingCount <= 0) {
      toast.error("You have reached your limit for this week.");
      return;
    }
    let toastId = null;
    if (!name) {
      toast.error("Enter a Name.");
      return;
    }

    toast.loading(
      `Generating ${type.charAt(0).toUpperCase() + type.slice(1)} Code...`
    );
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/code/${type.toLowerCase()}/add`,
        {
          name,
          pax: 1,
          paxChecked: 0,
          date: new Date().toLocaleDateString("en-GB"),
          condition: conditionText,
          event: user.events,
          host: user.name,
          hostId: user._id,
        },
        { responseType: "blob" }
      );
      toast.dismiss(toastId);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Code generated!`
      );
      if (limit !== undefined && limit > 0) {
        setRemainingCount((prev) => Math.max(prev - 1, 0)); // Decrease count for limited case
      } else {
        setRemainingCount((prev) => prev + 1); // Increase count for unlimited case
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
      refreshCounts();

      if (limit !== undefined) {
        setRemainingCount((prev) =>
          prev !== undefined ? prev - 1 : undefined
        );
      }
    } catch (error) {
      toast.error("Error generating code.");
      console.error("Code generation error:", error);
    }
  };

  const updateCount = (isDeleting = false) => {
    setRemainingCount((currentCount) => {
      if (limit !== undefined && limit > 0) {
        return isDeleting
          ? Math.min(currentCount + 1, limit)
          : Math.max(currentCount - 1, 0);
      } else {
        return isDeleting ? Math.max(currentCount - 1, 0) : currentCount + 1;
      }
    });
  };

  return (
    <div className={`code`}>
      <Toaster />
      <div className="login-back-arrow" onClick={onClose}>
        <img src="/image/back-icon.svg" alt="" />
      </div>
      <img
        className={`code-logo`}
        src="https://guest-code.s3.eu-north-1.amazonaws.com/server/AfroSpitiLogo.png"
        alt=""
      />
      {/* <h1 className={`code-title`}>{title}</h1>
      <p className={`code-description`}>{description}</p> */}
      <h1 className="code-title">{`${
        type.charAt(0).toUpperCase() + type.slice(1)
      }-Code`}</h1>
      <p className="code-subtitle">{description}</p>
      {/* Adjusted logic for displaying count */}
      <div className={`code-count`}>
        <h4>
          {limit && limit > 0 ? "REMAINING THIS WEEK" : "THIS WEEK'S COUNT"}
        </h4>
        <div className={`code-count-number`}>
          <p>{remainingCount}</p>
        </div>
      </div>

      <div className={`code-admin`}>
        <input
          className={`code-name`}
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleCode}>Generate</button>
      </div>
      <CodeManagement
        user={user}
        type={type}
        triggerUpdate={triggerUpdate}
        updateCount={updateCount}
        limit={limit}
      />

      {/* {downloadUrl && (
        <div className={`${type.toLowerCase()}code-preview`}>
          <p>SAVE IMAGE & SEND TO YOUR FRIEND</p>
          <img src={downloadUrl} alt="Code Preview" />
          <a href={downloadUrl} download={`${type}-code.png`}>
            DOWNLOAD
          </a>
        </div>
      )} */}
    </div>
  );
}

export default CodeGenerator;
