import React, { useState } from "react";
import "./FileUpload.scss";

const FileUpload = ({ handleUpload, uploadType, eventData }) => {
  const [validatedButtons, setValidatedButtons] = useState({
    instagramStory: false,
    squareFormat: false,
    landscape: false,
  });
  const aspectRatios = {
    instagramStory: "9:16",
    square: "1:1",
    landscape: "16:9",
  };
  const handleFileChange = async (event, ratio) => {
    const file = event.target.files[0];
    if (file) {
      const fileSize = file.size;
      const maxFlyerSize = 5 * 1024 * 1024; // 5 MB
      const maxVideoSize = 100 * 1024 * 1024; // 100 MB
      const maxSize = uploadType === "flyer" ? maxFlyerSize : maxVideoSize;

      if (fileSize > maxSize) {
        alert(
          `The uploaded file is too large. Maximum allowed size is ${
            maxSize / 1024 / 1024
          } MB.`
        );
        return;
      }

      const isValid =
        uploadType === "flyer"
          ? await validateAspectRatio(file, aspectRatios, ratio)
          : await validateVideoAspectRatio(file, aspectRatios, ratio);

      if (!isValid) {
        alert("The uploaded file does not match the chosen aspect ratio.");
        return;
      }

      setValidatedButtons({ ...validatedButtons, [ratio]: true });
      handleUpload(file, ratio, uploadType);
    }
  };

  const validateAspectRatio = async (file, aspectRatios, chosenRatio) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    const promise = new Promise((resolve) => {
      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;
        const targetAspectRatio = aspectRatios[chosenRatio]
          .split(":")
          .reduce((a, b) => a / b);
        resolve(Math.abs(aspectRatio - targetAspectRatio) < 0.15); // Increase tolerance value
      };
    });
    return promise;
  };

  const validateVideoAspectRatio = async (file, aspectRatios, chosenRatio) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);

    const promise = new Promise((resolve) => {
      video.addEventListener("loadedmetadata", () => {
        const { videoWidth: width, videoHeight: height } = video;
        const aspectRatio = width / height;
        const targetAspectRatio = aspectRatios[chosenRatio]
          .split(":")
          .reduce((a, b) => a / b);
        resolve(Math.abs(aspectRatio - targetAspectRatio) < 0.15); // Increase tolerance value
      });
    });
    return promise;
  };

  return (
    <div className={`file-upload ${uploadType}`}>
      <h3>Select {uploadType === "flyer" ? "Flyer" : "Video"} Format:</h3>
      <div className="format-buttons">
        {Object.keys(aspectRatios).map((ratio) => (
          <div className="format-container" key={ratio}>
            <label
              className={`format-button aspect-ratio-${ratio} ${
                validatedButtons[ratio] ? "validated" : ""
              }`}
            >
              <input
                type="file"
                name={uploadType}
                onChange={(e) => handleFileChange(e, ratio)}
                accept={uploadType === "flyer" ? "image/*" : "video/*"}
                style={{ display: "none" }}
              />
              {aspectRatios[ratio]} {validatedButtons[ratio] && "✓"}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUpload;
