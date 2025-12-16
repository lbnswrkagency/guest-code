const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { uploadToS3 } = require("../utils/s3Uploader");

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = req.body.folder || "uploads";
    const uploadPath = path.join(__dirname, "..", "uploads", folder);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, GIF and WebP are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Handle image upload
const handleImageUpload = (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(413)
            .json({ message: "File is too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Generate URL for the uploaded file
    const folder = req.body.folder || "uploads";
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;

    res.json({
      message: "File uploaded successfully",
      url: fileUrl,
    });
  });
};

// Handle image deletion
const handleImageDelete = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "No image URL provided" });
    }

    // Extract the file path from the URL
    const filePath = path.join(__dirname, "..", imageUrl);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Delete the file
    await fs.unlink(filePath);
    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

// Handle multiple resolution upload
const handleMultipleUpload = async (req, res) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
    },
  }).fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "medium", maxCount: 1 },
    { name: "full", maxCount: 1 },
  ]);

  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "File is too large. Maximum size is 10MB per file.",
          });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    try {
      const { folder, fileName } = req.body;
      if (!folder || !fileName) {
        return res
          .status(400)
          .json({ message: "Folder and fileName are required" });
      }

      const urls = {};
      for (const [quality, files] of Object.entries(req.files)) {
        if (files && files[0]) {
          const file = files[0];
          const key = `${folder}/${quality}/${fileName}`;
          const url = await uploadToS3(
            file.buffer,
            key,
            file.mimetype,
            quality
          );
          urls[quality] = url;
        }
      }

      res.json({ urls });
    } catch (error) {
      console.error("[UploadController] Multiple upload error:", error);
      res.status(500).json({ message: "Upload failed", error: error.message });
    }
  });
};

// Handle avatar upload with multiple resolutions
const handleAvatarUpload = async (req, res) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }).single("avatar");

  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(413)
            .json({ message: "File is too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Process the image for different resolutions
      const processed = {
        thumbnail: {
          file: req.file.buffer,
          contentType: req.file.mimetype,
        },
        medium: {
          file: req.file.buffer,
          contentType: req.file.mimetype,
        },
        full: {
          file: req.file.buffer,
          contentType: req.file.mimetype,
        },
      };

      const urls = {};
      for (const [quality, file] of Object.entries(processed)) {
        const key = `avatars/${quality}/${userId}`;
        const url = await uploadToS3(file.file, key, file.contentType, quality);
        urls[quality] = url;
      }

      // Update user's avatar in the database
      const User = require("../models/User");
      await User.findByIdAndUpdate(userId, { avatar: urls.medium });

      res.json({ urls });
    } catch (error) {
      console.error("[UploadController] Avatar upload error:", error);
      res.status(500).json({ message: "Upload failed", error: error.message });
    }
  });
};

module.exports = {
  handleImageUpload,
  handleImageDelete,
  handleMultipleUpload,
  handleAvatarUpload,
};
