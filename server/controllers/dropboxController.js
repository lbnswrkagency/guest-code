const { Dropbox } = require("dropbox");
require("dotenv").config();

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_API_ACCESS_TOKEN });

exports.getFolderContents = async (req, res) => {
  try {
    // List contents of the promotion_materials folder instead of root
    const listFolderResponse = await dbx.filesListFolder({
      path: "/promotion_materials",
    });

    const entries = listFolderResponse.result.entries;

    const filesWithThumbnails = await Promise.all(
      entries
        .filter((file) => isImage(file.name))
        .map(async (file) => {
          try {
            const thumbnailResponse = await dbx.filesGetThumbnail({
              path: file.path_lower,
            });
            file.thumbnailLink = `data:image/jpeg;base64,${thumbnailResponse.result.fileBinary.toString(
              "base64"
            )}`;
            return file;
          } catch (error) {
            console.error("Error fetching thumbnail:", error);
            return file;
          }
        })
    );

    res.status(200).json(filesWithThumbnails);
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json([]);
  }
};

exports.getDownloadLink = async (req, res) => {
  const { path } = req.params; // Path of the file for which the download link is requested
  try {
    const result = await dbx.filesGetTemporaryLink({ path });
    res.status(200).json({ link: result.result.link });
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json({
      message: "Failed to get download link",
      error: error.message,
    });
  }
};

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif)$/i.test(filename);
}

// Method to handle file uploads
exports.uploadFile = async (req, res) => {
  console.log("Starting upload process...");

  // Check for Dropbox token
  if (!process.env.DROPBOX_API_ACCESS_TOKEN) {
    console.error("Dropbox API token not found in environment variables");
    return res.status(500).json({
      message: "Dropbox configuration error",
      error: "API token not configured",
    });
  }

  // Check for files in request
  if (!req.files || Object.keys(req.files).length === 0) {
    console.error("No files received in request");
    return res.status(400).json({
      message: "No files were uploaded",
      error: "Missing files in request",
    });
  }

  let uploadedFile = req.files.uploadedFile;
  console.log("Received file:", {
    name: uploadedFile.name,
    size: uploadedFile.size,
    type: uploadedFile.mimetype,
  });

  // Add timestamp to filename to prevent conflicts
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}_${uploadedFile.name}`;
  const uploadPath = `/promotion_materials/${fileName}`;

  console.log("Attempting to upload to path:", uploadPath);

  try {
    // Try to create the folder first
    console.log("Checking/creating promotion_materials folder...");
    try {
      const folderResponse = await dbx.filesCreateFolderV2({
        path: "/promotion_materials",
      });
      console.log("Folder created:", folderResponse);
    } catch (error) {
      if (error.status === 409) {
        console.log("Folder already exists, continuing...");
      } else {
        console.error("Error creating folder:", error);
        throw error;
      }
    }

    // Attempt the upload
    console.log("Starting file upload to Dropbox...");
    const response = await dbx
      .filesUpload({
        path: uploadPath,
        contents: uploadedFile.data,
        mode: { ".tag": "add" },
      })
      .catch((error) => {
        console.error("Dropbox upload error:", {
          error: error.message,
          status: error.status,
          response: error.response,
        });
        throw error;
      });

    console.log("Upload response from Dropbox:", response);

    if (!response || !response.result) {
      throw new Error("Invalid response from Dropbox");
    }

    res.status(200).json({
      message: "File uploaded successfully!",
      path: uploadPath,
      name: fileName,
      dropboxResponse: response.result,
    });
  } catch (error) {
    console.error("Upload failed:", {
      error: error.message,
      stack: error.stack,
      status: error.status,
    });

    res.status(500).json({
      message: "Failed to upload file",
      error: error.message,
      details: error.response?.data || "No additional details available",
    });
  }
};
