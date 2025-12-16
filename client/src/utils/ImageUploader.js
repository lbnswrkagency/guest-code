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

const folders = {
  BRAND_LOGOS: "brands/logos",
  BRAND_COVERS: "brands/covers",
};

async function uploadMultipleResolutions(
  processedFiles,
  folder,
  fileName,
  onProgress,
  signal
) {
  try {
    // Check if already aborted
    if (signal?.aborted) {
      throw new Error("Upload was cancelled");
    }

    const formData = new FormData();
    formData.append("folder", folder);
    formData.append("fileName", fileName);

    // Add each resolution to form data
    Object.entries(processedFiles).forEach(([quality, data]) => {
      formData.append(quality, data.file);
    });

    // Get token from localStorage
    const token = localStorage.getItem("token");

    // Use axios instead of fetch
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/upload/multiple`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        signal, // Pass the abort signal
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );

    return response.data.urls;
  } catch (error) {
    // Don't log aborted requests as errors
    if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
      console.log("[ImageUploader] Upload cancelled");
      return null;
    }
    console.error("[ImageUploader] Upload failed:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
}

const ImageUploader = {
  upload: uploadImage,
  delete: deleteImage,
  folders,
  uploadMultipleResolutions,
};

export default ImageUploader;
