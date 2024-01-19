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
  <div className="flex flex-col justify-center">
    <AvatarEditor
      className="mx-auto rounded-full"
      image={imageSrc}
      scale={scaleValue}
      ref={setEditorRef}
      borderRadius={100}
      border={0}
    />
    <span className="text-center text-xs text-rose-500 font-medium uppercase mt-2 mb-2">v Bitte bestätigen v</span>
    <div className="relative flex gap-2 items-center justify-between">
      <div className="p-1.5 rounded-full bg-pink">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-white"
          onClick={onCancel}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <input
        className="flex w-full accent-pink"
        type="range"
        value={scaleValue}
        min="1"
        max="10"
        onChange={onScaleChange}
      />

      <div className="p-1.5 rounded-full bg-pink">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-white"
          onClick={onCrop}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>
    </div>
  </div>
);

export default AvatarImageCrop;
