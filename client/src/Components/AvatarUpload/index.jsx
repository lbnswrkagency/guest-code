import React, { Component } from "react";
import axios from "axios";
import $ from "jquery";
import AvatarImageCrop from "./components/AvatarImageCrop";
import UploadIcon from "./svg/UploadIcon";

class AvatarUpload extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      editor: null,
      scaleValue: 1,
      cropMode: false,
      profileCheck: props.profileCheck,
      selectedFile: null,
      user: props.user,
      setUser: props.setUser,
      setTeam: props.setTeam,
      setImageSwitch: props.setImageSwitch,
    };
  }

  setEditorRef = (editor) => this.setState({ editor });

  profileImageChange = (fileChangeEvent) => {
    const file = fileChangeEvent.target.files[0];
    const { type } = file;
    if (type.endsWith("jpeg") || type.endsWith("png") || type.endsWith("jpg")) {
      // this.setState({ selectedImage: file });
      this.setState({ selectedFile: file });
    }
    this.setState({ cropMode: true });
    this.state.setImageSwitch(true);
  };

  onCrop = (event) => {
    // If file selected
    const { editor } = this.state;

    const data = new FormData();

    if (editor) {
      let canvas = editor.getImageScaledToCanvas().toDataURL("image/png");

      var arr = canvas.split(","),
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      var file = new File([u8arr], "abc.png", { type: "image/jpeg" });

      data.append("profileImage", file, this.state.selectedFile.name);
      data.append("userId", this.state.user._id);

      axios
        .post(
          `${process.env.REACT_APP_API_BASE_URL}/avatar/profile-img-upload`,
          data,
          {
            headers: {
              accept: "application/json",
              "Accept-Language": "en-US,en;q=0.8",
              "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
            },
          }
        )
        .then((response) => {
          if (200 === response.status) {
            // If file size is larger than expected.
            if (response.data.error) {
              if ("LIMIT_FILE_SIZE" === response.data.error.code) {
                this.ocShowAlert("Max size: 2MB", "red");
              } else {
                this.ocShowAlert(response.data.error, "red");
              }
            } else {
              // Success
              let fileName = response.data;

              // Continue with profile avatar upload logic
              axios
                .post(
                  `${
                    process.env.NODE_ENV === "production"
                      ? "api"
                      : "http://localhost:5001/api"
                  }/register/add/avatar`,
                  {
                    avatar: fileName.location,
                    email: this.state.user.email,
                    userId: this.state.user._id,
                  }
                )
                .then((response2) => {
                  this.state.setUser({
                    ...this.state.user,
                    avatar: response2.data,
                  });
                  this.setState({ cropMode: false });
                  this.state.setImageSwitch(false);
                });
            }
          }
        })
        .catch((error) => {
          // If another error
          this.ocShowAlert(error, "red");
        });
    } else {
      // if file not selected throw error
      this.ocShowAlert("Please upload file", "red");
    }
  };

  onCancel = () => {
    this.setState({ cropMode: false });
    this.state.setImageSwitch(false);
  };

  onScaleChange = (scaleValueEvent) => {
    const scaleValue = parseFloat(scaleValueEvent.target.value);
    this.setState({ scaleValue });
  };

  // ShowAlert Function
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
