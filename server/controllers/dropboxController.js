const { Dropbox } = require("dropbox");
require("dotenv").config();

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_API_ACCESS_TOKEN });

exports.getFolderContents = async (req, res) => {
  console.log("Accessing Folder Contents");
  try {
    const response = await dbx.filesListFolder({ path: "" }); // Root of the App folder
    console.log("Files List:", response.result.entries);
    res.status(200).json(response.result.entries); // Always an array, empty or filled
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json([]); // Return empty array on error
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
exports.getFolderContents = async (req, res) => {
  try {
    const listFolderResponse = await dbx.filesListFolder({ path: "" });
    const entries = listFolderResponse.result.entries;

    const filesWithThumbnails = await Promise.all(
      entries
        .filter((file) => isImage(file.name))
        .map(async (file) => {
          try {
            const thumbnailResponse = await dbx.filesGetThumbnail({
              path: file.path_lower,
            });
            // Convert binary data to a base64 string for JSON-friendly transport
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

    console.log("Files List with Thumbnails:", filesWithThumbnails);
    res.status(200).json(filesWithThumbnails);
  } catch (error) {
    console.error("Dropbox API error:", error);
    res.status(500).json([]);
  }
};

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif)$/i.test(filename);
}

// Method to handle file uploads
exports.uploadFile = async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

  let uploadedFile = req.files.uploadedFile; // The name 'uploadedFile' depends on your input field in the frontend

  // Upload to Dropbox
  try {
    const response = await dbx.filesUpload({
      path: `/${uploadedFile.name}`,
      contents: uploadedFile.data,
    });
    console.log("Upload successful:", response);
    res.status(200).send("File uploaded!");
  } catch (error) {
    console.error("Failed to upload file:", error);
    res.status(500).send("Failed to upload file");
  }
};
