import React from "react";
import AvatarEditor from "react-avatar-editor";

const AvatarImageCrop = ({
  imageSrc,
  onCrop,
  setEditorRef,
  scaleValue,
  onScaleChange,
  onCancel,
}) => (
  <div className="avatar-crop">
    <AvatarEditor
      className="avatar-crop-editor"
      image={imageSrc}
      scale={scaleValue}
      ref={setEditorRef}
      borderRadius={100}
      border={0}
    />

    <div className="avatar-crop-controls">
      {/* <span className="avatar-crop-controls-text">BESTÄTIGEN</span> */}

      <div className="avatar-crop-controls-cancel" onClick={onCancel}>
        <img
          className="avatar-controls"
          src="/image/cancel-icon_w.svg"
          alt=""
        />
      </div>

      <input
        className="avatar-crop-controls-range"
        type="range"
        value={scaleValue}
        min="1"
        max="10"
        onChange={onScaleChange}
      />
      <div className="avatar-crop-controls-confirm" onClick={onCrop}>
        <img className="avatar-controls" src="/image/check-icon_w.svg" alt="" />
      </div>
    </div>
  </div>
);

export default AvatarImageCrop;
