import axios from "axios";
import toast from "react-hot-toast";

const uploadImage = async (file, folder, type = "image") => {
  const loadingToast = toast.loading("Uploading image...");
  try {
    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("type", type);

    // Get token from localStorage
    const token = localStorage.getItem("token");

    // Make API call to upload endpoint
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/upload/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );

    toast.success("Image uploaded successfully!", { id: loadingToast });
    return response.data.url;
  } catch (error) {
    console.error("Upload error:", error);
    if (error.response?.status === 401) {
      toast.error("Authentication failed. Please log in again.", {
        id: loadingToast,
      });
      throw new Error("Authentication failed");
    } else if (error.response?.status === 413) {
      toast.error("Image is too large. Maximum size is 5MB.", {
        id: loadingToast,
      });
    } else {
      toast.error("Failed to upload image. Please try again.", {
        id: loadingToast,
      });
    }
    throw error;
  }
};

const deleteImage = async (imageUrl) => {
  const loadingToast = toast.loading("Deleting image...");
  try {
    const token = localStorage.getItem("token");

    await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/upload/image`, {
      data: { imageUrl },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    });

    toast.success("Image deleted successfully!", { id: loadingToast });
  } catch (error) {
    console.error("Delete error:", error);
    toast.error("Failed to delete image. Please try again.", {
      id: loadingToast,
    });
    throw error;
  }
};

const ImageUploader = {
  upload: uploadImage,
  delete: deleteImage,

  // Predefined folder paths
  folders: {
    PROFILE_PICTURES: "profile-pictures",
    BRAND_LOGOS: "brand-logos",
    BRAND_COVERS: "brand-covers",
    EVENT_IMAGES: "event-images",
    LOCATION_IMAGES: "location-images",
    FEED_POSTS: "feed-posts",
  },
};

export default ImageUploader;
