import React, { Component } from "react";
import axios from "axios";
import $ from "jquery";
import AvatarImageCrop from "./components/AvatarImageCrop";
import UploadIcon from "./svg/UploadIcon";

class AvatarUpload extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editor: null,
      scaleValue: 1,
      cropMode: false,
      profileCheck: props.profileCheck,
      selectedFile: null,
      user: props.user,
    };
  }

  setEditorRef = (editor) => this.setState({ editor });

  profileImageChange = (fileChangeEvent) => {
    const file = fileChangeEvent.target.files[0];
    const { type } = file;
    if (type.endsWith("jpeg") || type.endsWith("png") || type.endsWith("jpg")) {
      this.setState({ selectedFile: file });
    }
    this.setState({ cropMode: true });
    this.props.setIsCropMode(true); // Use prop directly instead of state
    this.props.onCropModeChange(true);
  };

  onCrop = () => {
    const { editor, selectedFile } = this.state;
    const { user, setUser } = this.props; // Get from props

    if (editor && selectedFile) {
      let canvas = editor.getImageScaledToCanvas().toDataURL("image/png");
      let arr = canvas.split(",");
      let bstr = atob(arr[1]);
      let n = bstr.length;
      let u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      let file = new File([u8arr], "avatar.png", { type: "image/jpeg" });

      const data = new FormData();
      data.append("profileImage", file);
      data.append("userId", user._id);

      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/avatar/profile-img-upload`,
          data,
          {
            headers: {
              accept: "application/json",
              "Accept-Language": "en-US,en;q=0.8",
            },
          }
        )
        .then((response) => {
          if (response.status === 200) {
            const updatedUser = {
              ...user,
              avatar: response.data.imageUrl,
            };

            setUser(updatedUser);
            this.setState({ cropMode: false });
            this.props.setIsCropMode(false); // Use prop directly
            this.props.onCropModeChange(false);
          }
        })
        .catch((error) => {
          this.ocShowAlert(`Error: ${error.message}`, "red");
        });
    } else {
      this.ocShowAlert("Please upload file", "red");
    }
  };

  onCancel = () => {
    this.setState({ cropMode: false });
    this.props.setIsCropMode(false); // Use prop directly
    this.props.onCropModeChange(false);
  };

  onScaleChange = (scaleValueEvent) => {
    const scaleValue = parseFloat(scaleValueEvent.target.value);
    this.setState({ scaleValue });
  };

  ocShowAlert = (message, background = "#3089cf") => {
    let alertContainer = document.querySelector("#oc-alert-container"),
      alertEl = document.createElement("div"),
      textNode = document.createTextNode(message);
    alertEl.setAttribute("class", "oc-alert-pop-up");
    $(alertEl).css("background", background);
    alertEl.appendChild(textNode);
    alertContainer.appendChild(alertEl);
    setTimeout(function () {
      $(alertEl).fadeOut("slow");
      $(alertEl).remove();
    }, 3000);
  };

  render() {
    return (
      <div className="profileApp">
        <div id="oc-alert-container"></div>

        {!this.state.cropMode ? (
          <>
            <div className="image-upload">
              <label htmlFor="file-input">
                <UploadIcon />
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={this.profileImageChange}
                id="file-input"
                className="image-upload-file"
              />
            </div>
          </>
        ) : (
          <AvatarImageCrop
            imageSrc={this.state.selectedFile}
            setEditorRef={this.setEditorRef}
            onCrop={this.onCrop}
            onCancel={this.onCancel}
            scaleValue={this.state.scaleValue}
            onScaleChange={this.onScaleChange}
          />
        )}
      </div>
    );
  }
}

export default AvatarUpload;
